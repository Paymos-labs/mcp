import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ErrorCode, LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS,
  type JSONRPCMessage, type JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Readable, Writable } from "node:stream";
import { MERCHANT_TOOLS } from "./generated/merchant-tools.js";
import {
  defaultTokenPath, MERCHANT_MCP_RESOURCE_PATH, requireAccessToken,
  tryGetAccessToken, validateOrigin, type OAuthSessionOptions,
} from "./oauth-session.js";
import { MCP_VERSION } from "./version.js";

type Env = Readonly<Record<string, string | undefined>>;

export const CONNECT_COPY = {
  help: `Usage: npx -y @paymos/mcp connect [options]

Run the local stdio bridge for Paymos Merchant MCP with OAuth 2.1 PKCE.

Options:
  --origin URL       Paymos origin override (default: https://app.paymos.io)
  --token-file PATH  OAuth token store path override
  --help, -h         Show this help`,
  errors: {
    arguments: "Check connect options: an option is unknown, repeated, or missing its value. Run connect --help for usage.",
  },
} as const;

export interface ConnectRuntimeOptions {
  readonly stdin?: Readable;
  readonly stdout?: Writable;
  readonly stderr?: Writable;
  readonly fetch?: typeof fetch;
  readonly openBrowser?: (url: string) => Promise<void> | void;
  readonly now?: () => number;
  readonly context?: { readonly home?: string; readonly platform?: NodeJS.Platform };
  readonly signal?: AbortSignal;
  readonly toolsListTimeoutMs?: number;
  readonly toolsCallTimeoutMs?: number;
  readonly loginTimeoutMs?: number;
}

const TOOLS_LIST_TIMEOUT_MS = 5_000;
const TOOLS_CALL_TIMEOUT_MS = 120_000;

interface ParsedConnectFlags {
  readonly origin?: string;
  readonly tokenFile?: string;
  readonly help: boolean;
}

function parseConnectFlags(argv: readonly string[]): ParsedConnectFlags {
  let origin: string | undefined;
  let tokenFile: string | undefined;
  let help = false;
  const seen = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]!;
    const split = raw.indexOf("=");
    const flag = split < 0 ? raw : raw.slice(0, split);
    const normalized = flag === "-h" ? "--help" : flag;
    if (seen.has(normalized)) throw new Error(CONNECT_COPY.errors.arguments);
    seen.add(normalized);

    if (normalized === "--help") {
      if (split >= 0) throw new Error(CONNECT_COPY.errors.arguments);
      help = true;
      continue;
    }
    if (normalized !== "--origin" && normalized !== "--token-file") {
      throw new Error(CONNECT_COPY.errors.arguments);
    }
    const value = split < 0 ? argv[++i] : raw.slice(split + 1);
    if (value === undefined || value.trim() === "" || value.startsWith("--")) {
      throw new Error(CONNECT_COPY.errors.arguments);
    }
    if (normalized === "--origin") origin = value;
    else tokenFile = value;
  }

  return {
    ...(origin !== undefined ? { origin } : {}),
    ...(tokenFile !== undefined ? { tokenFile } : {}),
    help,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonRpcRequest(message: JSONRPCMessage): message is JSONRPCRequest {
  return isPlainObject(message) && "method" in message && "id" in message && message.id !== undefined;
}

function redactSecrets(text: string, secrets: readonly (string | undefined)[]): string {
  let sanitized = text.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
  for (const secret of secrets) {
    if (secret && secret.length >= 6) {
      sanitized = sanitized.split(secret).join("[redacted]");
    }
  }
  return sanitized;
}

interface RemoteRpcOutcome {
  readonly status: number;
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown };
  readonly sessionId?: string;
}

function parseSsePayloads(body: string): unknown[] {
  const messages: unknown[] = [];
  const lines = body.split(/\r\n|\n|\r/);
  let dataLines: string[] = [];

  const flush = () => {
    if (dataLines.length === 0) return;
    const payload = dataLines.join("\n").trim();
    dataLines = [];
    if (payload === "" || payload === "[DONE]") return;
    try {
      messages.push(JSON.parse(payload));
    } catch { /* Ignore non-JSON SSE control frames. */ }
  };

  for (const line of lines) {
    if (line === "") {
      flush();
      continue;
    }
    if (line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      const value = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
      dataLines.push(value);
    }
  }
  flush();
  return messages;
}

function extractRpcEnvelope(
  candidates: readonly unknown[],
  expectedId: string | number,
  secrets: readonly (string | undefined)[],
): Omit<RemoteRpcOutcome, "status" | "sessionId"> | undefined {
  let fallback: Omit<RemoteRpcOutcome, "status" | "sessionId"> | undefined;
  for (const item of candidates) {
    if (!isPlainObject(item)) continue;
    if ("method" in item && !("id" in item && item.id !== undefined)) continue;
    const matchesId = item.id === expectedId;
    if ("error" in item && isPlainObject(item.error)) {
      const code = typeof item.error.code === "number" ? item.error.code : ErrorCode.InternalError;
      const message = typeof item.error.message === "string"
        ? redactSecrets(item.error.message, secrets)
        : "Remote MCP request failed.";
      const entry = {
        error: {
          code,
          message,
          ...(item.error.data !== undefined ? { data: item.error.data } : {}),
        },
      };
      if (matchesId) return entry;
      fallback ??= entry;
      continue;
    }
    if ("result" in item && isPlainObject(item.result)) {
      const entry = { result: item.result };
      if (matchesId) return entry;
      fallback ??= entry;
    }
  }
  return fallback;
}

async function postRemoteMcp(
  url: string,
  accessToken: string,
  protocolVersion: string,
  request: JSONRPCRequest,
  fetchFn: typeof fetch,
  timeoutMs: number,
  knownSecrets: ReadonlySet<string>,
  sessionId?: string,
  externalSignal?: AbortSignal,
): Promise<RemoteRpcOutcome> {
  const timer = AbortSignal.timeout(timeoutMs);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timer]) : timer;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": protocolVersion,
    Authorization: `Bearer ${accessToken}`,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const response = await fetchFn(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      method: request.method,
      ...(request.params !== undefined ? { params: request.params } : {}),
    }),
    credentials: "omit",
    redirect: "error",
    signal,
  });

  const nextSessionId = response.headers.get("Mcp-Session-Id") ?? undefined;
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    return {
      status: response.status,
      ...(nextSessionId !== undefined ? { sessionId: nextSessionId } : {}),
    };
  }

  const contentType = response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  const rawBody = await response.text();
  const secrets = [accessToken, ...knownSecrets];

  if (contentType === "text/event-stream") {
    const parsed = parseSsePayloads(rawBody);
    const extracted = extractRpcEnvelope(parsed, request.id, secrets);
    return {
      status: response.status,
      ...extracted,
      ...(nextSessionId !== undefined ? { sessionId: nextSessionId } : {}),
    };
  }

  if (contentType === "application/json" || rawBody.trim().startsWith("{") || rawBody.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const extracted = extractRpcEnvelope(list, request.id, secrets);
      return {
        status: response.status,
        ...extracted,
        ...(nextSessionId !== undefined ? { sessionId: nextSessionId } : {}),
      };
    } catch {
      return {
        status: response.status,
        ...(nextSessionId !== undefined ? { sessionId: nextSessionId } : {}),
      };
    }
  }

  return {
    status: response.status,
    ...(nextSessionId !== undefined ? { sessionId: nextSessionId } : {}),
  };
}

export async function runConnect(
  argv: readonly string[],
  env: Env = process.env,
  options: ConnectRuntimeOptions = {},
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  let flags: ParsedConnectFlags;
  try {
    flags = parseConnectFlags(argv);
  } catch (cause) {
    stderr.write(`[paymos-mcp] ${cause instanceof Error ? cause.message : String(cause)}\n`);
    return 1;
  }

  if (flags.help) {
    stdout.write(CONNECT_COPY.help + "\n");
    return 0;
  }

  let origin: string;
  try {
    origin = validateOrigin(flags.origin ?? env.PAYMOS_MCP_ORIGIN);
  } catch (cause) {
    stderr.write(`[paymos-mcp] ${cause instanceof Error ? cause.message : "invalid_origin"}\n`);
    return 1;
  }

  const tokenFile = flags.tokenFile ?? defaultTokenPath(env, options.context);
  const fetchFn = options.fetch ?? globalThis.fetch;
  const stdin = options.stdin ?? process.stdin;
  const resourceUrl = `${origin}${MERCHANT_MCP_RESOURCE_PATH}`;
  const toolsListTimeoutMs = options.toolsListTimeoutMs ?? TOOLS_LIST_TIMEOUT_MS;
  const toolsCallTimeoutMs = options.toolsCallTimeoutMs ?? TOOLS_CALL_TIMEOUT_MS;

  const knownSecrets = new Set<string>();
  const baseSessionOptions: OAuthSessionOptions = {
    origin,
    tokenFile,
    env,
    fetch: fetchFn,
    onSession: session => {
      knownSecrets.add(session.access_token);
      if (session.refresh_token) knownSecrets.add(session.refresh_token);
    },
    ...(options.context !== undefined ? { context: options.context } : {}),
    ...(options.openBrowser !== undefined ? { openBrowser: options.openBrowser } : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
    ...(options.loginTimeoutMs !== undefined ? { loginTimeoutMs: options.loginTimeoutMs } : {}),
  };

  let negotiatedProtocol = "2025-06-18";
  let remoteSessionId: string | undefined;
  const transport = new StdioServerTransport(stdin, stdout);
  const pending = new Set<Promise<void>>();

  const sendResult = (id: string | number, result: Record<string, unknown>) =>
    transport.send({ jsonrpc: "2.0", id, result });

  const sendError = (id: string | number, code: number, message: string) =>
    transport.send({ jsonrpc: "2.0", id, error: { code, message } });

  const handleToolsList = async (request: JSONRPCRequest): Promise<void> => {
    const started = Date.now();
    const listAbort = AbortSignal.timeout(toolsListTimeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, listAbort]) : listAbort;
    try {
      const token = await tryGetAccessToken({ ...baseSessionOptions, signal });
      if (!token) {
        await sendResult(request.id, { tools: MERCHANT_TOOLS });
        return;
      }
      const remaining = Math.max(1, toolsListTimeoutMs - (Date.now() - started));
      const outcome = await postRemoteMcp(
        resourceUrl, token, negotiatedProtocol, request, fetchFn, remaining, knownSecrets, remoteSessionId, signal,
      );
      if (outcome.sessionId) remoteSessionId = outcome.sessionId;
      if (outcome.status === 200 && outcome.result && Array.isArray(outcome.result.tools)) {
        await sendResult(request.id, outcome.result);
        return;
      }
    } catch {
      // Silent fallback keeps IDE startup unblocked on missing/stale tokens or network outages.
    }
    await sendResult(request.id, { tools: MERCHANT_TOOLS });
  };

  const handleToolsCall = async (request: JSONRPCRequest): Promise<void> => {
    let token: string | undefined;
    try {
      token = await requireAccessToken(baseSessionOptions);
      let outcome = await postRemoteMcp(
        resourceUrl, token, negotiatedProtocol, request, fetchFn, toolsCallTimeoutMs,
        knownSecrets, remoteSessionId, options.signal,
      );
      if (outcome.sessionId) remoteSessionId = outcome.sessionId;

      if (outcome.status === 401) {
        token = await requireAccessToken({
          ...baseSessionOptions,
          forceRefresh: true,
          failedAccessToken: token,
        });
        outcome = await postRemoteMcp(
          resourceUrl, token, negotiatedProtocol, request, fetchFn, toolsCallTimeoutMs,
          knownSecrets, remoteSessionId, options.signal,
        );
        if (outcome.sessionId) remoteSessionId = outcome.sessionId;
      }

      if (outcome.result) {
        await sendResult(request.id, outcome.result);
        return;
      }
      if (outcome.error) {
        await transport.send({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: outcome.error.code,
            message: redactSecrets(outcome.error.message, [token, ...knownSecrets]),
            ...(outcome.error.data !== undefined ? { data: outcome.error.data } : {}),
          },
        });
        return;
      }
      await sendError(
        request.id,
        ErrorCode.InternalError,
        outcome.status >= 400
          ? `Merchant MCP request failed with HTTP ${outcome.status}.`
          : "Merchant MCP returned an invalid response.",
      );
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : "Merchant MCP tool call failed.";
      await sendError(request.id, ErrorCode.InternalError, redactSecrets(raw, [token, ...knownSecrets]));
    }
  };

  const dispatch = async (message: JSONRPCMessage): Promise<void> => {
    if (!isJsonRpcRequest(message)) {
      // Notifications (e.g. notifications/initialized, notifications/cancelled) require no response or network call.
      return;
    }

    switch (message.method) {
      case "initialize": {
        const requested = isPlainObject(message.params) ? message.params.protocolVersion : undefined;
        negotiatedProtocol = typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION;
        await sendResult(message.id, {
          protocolVersion: negotiatedProtocol,
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "paymos-merchant",
            version: MCP_VERSION,
          },
        });
        return;
      }
      case "ping":
        await sendResult(message.id, {});
        return;
      case "resources/list":
        await sendResult(message.id, { resources: [] });
        return;
      case "resources/templates/list":
        await sendResult(message.id, { resourceTemplates: [] });
        return;
      case "prompts/list":
        await sendResult(message.id, { prompts: [] });
        return;
      case "tools/list":
        await handleToolsList(message);
        return;
      case "tools/call":
        await handleToolsCall(message);
        return;
      default:
        await sendError(message.id, ErrorCode.MethodNotFound, `Method not found: ${message.method}`);
        return;
    }
  };

  transport.onmessage = message => {
    const task = dispatch(message).catch(error => {
      stderr.write(`[paymos-mcp] ${redactSecrets(error instanceof Error ? error.message : String(error), [])}\n`);
    });
    pending.add(task);
    void task.finally(() => pending.delete(task));
  };

  transport.onerror = error => {
    stderr.write(`[paymos-mcp] transport error: ${error.message}\n`);
  };

  await transport.start();

  await new Promise<void>(resolve => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      stdin.off("end", done);
      stdin.off("close", done);
      options.signal?.removeEventListener("abort", done);
      resolve();
    };
    if (stdin.readableEnded || stdin.destroyed || options.signal?.aborted) {
      done();
      return;
    }
    stdin.once("end", done);
    stdin.once("close", done);
    options.signal?.addEventListener("abort", done, { once: true });
  });

  await Promise.allSettled([...pending]);
  await transport.close();
  return 0;
}
