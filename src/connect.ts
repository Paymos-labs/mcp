import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ErrorCode, LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS,
  type JSONRPCMessage, type JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Readable, Writable } from "node:stream";
import { CONNECT_INSTRUCTIONS, LOCAL_CONNECT_TOOLS, tryHandleLocalConnectTool } from "./connect-advisor.js";
import { MERCHANT_TOOLS } from "./generated/merchant-tools.js";
import { CONNECT_DOC_RESOURCES } from "./generated/resources.js";
import {
  acquireConnectAccessToken, defaultTokenPath, MERCHANT_MCP_RESOURCE_PATH, openUrlInBrowser,
  resolveSafeContinuationUrl, tryGetAccessToken, validateOrigin, type OAuthSessionOptions,
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
  readonly loginFastPathMs?: number;
}

const TOOLS_LIST_TIMEOUT_MS = 5_000;
const TOOLS_CALL_TIMEOUT_MS = 120_000;
const CONTINUATION_OPEN_DEDUP_MS = 60_000;
const MAX_OPENED_CONTINUATIONS = 128;
const CONNECT_DOC_BY_URI = new Map(CONNECT_DOC_RESOURCES.map(item => [item.uri, item]));
const LOCAL_TOOL_NAMES = new Set(LOCAL_CONNECT_TOOLS.map(tool => tool.name));

function mergeConnectTools(baseTools: readonly unknown[]): unknown[] {
  const remaining = baseTools.filter(
    tool => !(isPlainObject(tool) && typeof tool.name === "string" && LOCAL_TOOL_NAMES.has(tool.name)),
  );
  return [...LOCAL_CONNECT_TOOLS, ...remaining];
}

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

function buildLoginRequiredResult(authorizeUrl: string): Record<string, unknown> {
  const payload = {
    status: "user_action_required",
    reason: "login_required",
    continue_url: authorizeUrl,
    authorize_url: authorizeUrl,
    browser_opened: true,
    message:
      "Paymos sign-in opened in your default browser. To use a different browser or profile, copy continue_url into that browser and approve access, then retry this tool call.",
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

function rememberOpenedContinuation(cache: Map<string, number>, url: string, timestamp: number): void {
  if (cache.has(url)) {
    cache.delete(url);
  } else if (cache.size >= MAX_OPENED_CONTINUATIONS) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(url, timestamp);
}

async function normalizeAndOpenContinuation(
  result: Record<string, unknown>,
  origin: string,
  openedContinuations: Map<string, number>,
  now: () => number,
  openBrowser?: (url: string) => Promise<void> | void,
): Promise<Record<string, unknown>> {
  if (result.isError === true) return result;

  let nextStructured = result.structuredContent;
  const urlsToOpen = new Set<string>();

  if (
    isPlainObject(result.structuredContent)
    && result.structuredContent.status === "user_action_required"
    && typeof result.structuredContent.continue_url === "string"
  ) {
    const fullUrl = resolveSafeContinuationUrl(result.structuredContent.continue_url, origin);
    if (fullUrl !== undefined) {
      urlsToOpen.add(fullUrl);
      nextStructured = { ...result.structuredContent, continue_url: fullUrl };
    }
  }

  let nextContent = result.content;
  if (Array.isArray(result.content)) {
    let contentChanged = false;
    const mappedContent = result.content.map(item => {
      if (!isPlainObject(item) || item.type !== "text" || typeof item.text !== "string") {
        return item;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(item.text);
      } catch {
        return item;
      }
      if (
        !isPlainObject(parsed)
        || parsed.status !== "user_action_required"
        || typeof parsed.continue_url !== "string"
      ) {
        return item;
      }
      const fullUrl = resolveSafeContinuationUrl(parsed.continue_url, origin);
      if (fullUrl === undefined) {
        return item;
      }
      urlsToOpen.add(fullUrl);
      contentChanged = true;
      return {
        ...item,
        text: JSON.stringify({ ...parsed, continue_url: fullUrl }),
      };
    });
    if (contentChanged) {
      nextContent = mappedContent;
    }
  }

  if (urlsToOpen.size === 0) {
    return result;
  }

  for (const fullContinueUrl of urlsToOpen) {
    const nowMs = now();
    const lastOpened = openedContinuations.get(fullContinueUrl);
    if (lastOpened === undefined || nowMs - lastOpened >= CONTINUATION_OPEN_DEDUP_MS) {
      rememberOpenedContinuation(openedContinuations, fullContinueUrl, nowMs);
      await openUrlInBrowser(fullContinueUrl, origin, openBrowser);
    }
  }

  return {
    ...result,
    ...(nextStructured !== result.structuredContent ? { structuredContent: nextStructured } : {}),
    ...(nextContent !== result.content ? { content: nextContent } : {}),
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

  const sessionController = new AbortController();
  const onExternalAbort = () => sessionController.abort();
  if (options.signal) {
    if (options.signal.aborted) sessionController.abort();
    else options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const now = options.now ?? Date.now;
  const openedContinuations = new Map<string, number>();
  const knownSecrets = new Set<string>();
  const baseSessionOptions: OAuthSessionOptions = {
    origin,
    tokenFile,
    env,
    fetch: fetchFn,
    signal: sessionController.signal,
    onSession: session => {
      knownSecrets.add(session.access_token);
      if (session.refresh_token) knownSecrets.add(session.refresh_token);
    },
    ...(options.context !== undefined ? { context: options.context } : {}),
    ...(options.openBrowser !== undefined ? { openBrowser: options.openBrowser } : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
    ...(options.loginTimeoutMs !== undefined ? { loginTimeoutMs: options.loginTimeoutMs } : {}),
  };
  const acquireTokenOptions = {
    ...baseSessionOptions,
    ...(options.loginFastPathMs !== undefined ? { loginFastPathMs: options.loginFastPathMs } : {}),
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
    const signal = AbortSignal.any([sessionController.signal, listAbort]);
    try {
      const token = await tryGetAccessToken({ ...baseSessionOptions, signal });
      if (!token) {
        await sendResult(request.id, { tools: mergeConnectTools(MERCHANT_TOOLS) });
        return;
      }
      const remaining = Math.max(1, toolsListTimeoutMs - (Date.now() - started));
      const outcome = await postRemoteMcp(
        resourceUrl, token, negotiatedProtocol, request, fetchFn, remaining, knownSecrets, remoteSessionId, signal,
      );
      if (outcome.sessionId) remoteSessionId = outcome.sessionId;
      if (outcome.status === 200 && outcome.result && Array.isArray(outcome.result.tools)) {
        await sendResult(request.id, {
          ...outcome.result,
          tools: mergeConnectTools(outcome.result.tools),
        });
        return;
      }
    } catch {
      // Silent fallback keeps IDE startup unblocked on missing/stale tokens or network outages.
    }
    await sendResult(request.id, { tools: mergeConnectTools(MERCHANT_TOOLS) });
  };

  const handleToolsCall = async (request: JSONRPCRequest): Promise<void> => {
    const params = isPlainObject(request.params) ? request.params : undefined;
    const toolName = typeof params?.name === "string" ? params.name : undefined;
    if (toolName !== undefined) {
      const localResult = await tryHandleLocalConnectTool(toolName, params?.arguments, {
        origin,
        tokenFile,
        env,
        ...(options.context?.platform !== undefined ? { platform: options.context.platform } : {}),
        ...(options.now !== undefined ? { now: options.now } : {}),
      });
      if (localResult !== undefined) {
        await sendResult(request.id, localResult as unknown as Record<string, unknown>);
        return;
      }
    }

    let token: string | undefined;
    try {
      let authResult = await acquireConnectAccessToken(acquireTokenOptions);
      if (authResult.status === "login_required") {
        await sendResult(request.id, buildLoginRequiredResult(authResult.authorizeUrl));
        return;
      }
      token = authResult.accessToken;
      let outcome = await postRemoteMcp(
        resourceUrl, token, negotiatedProtocol, request, fetchFn, toolsCallTimeoutMs,
        knownSecrets, remoteSessionId, sessionController.signal,
      );
      if (outcome.sessionId) remoteSessionId = outcome.sessionId;

      if (outcome.status === 401) {
        authResult = await acquireConnectAccessToken({
          ...acquireTokenOptions,
          forceRefresh: true,
          failedAccessToken: token,
        });
        if (authResult.status === "login_required") {
          await sendResult(request.id, buildLoginRequiredResult(authResult.authorizeUrl));
          return;
        }
        token = authResult.accessToken;
        outcome = await postRemoteMcp(
          resourceUrl, token, negotiatedProtocol, request, fetchFn, toolsCallTimeoutMs,
          knownSecrets, remoteSessionId, sessionController.signal,
        );
        if (outcome.sessionId) remoteSessionId = outcome.sessionId;
      }

      if (outcome.result) {
        const processed = await normalizeAndOpenContinuation(
          outcome.result,
          origin,
          openedContinuations,
          now,
          options.openBrowser,
        );
        await sendResult(request.id, processed);
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
          instructions: CONNECT_INSTRUCTIONS,
        });
        return;
      }
      case "ping":
        await sendResult(message.id, {});
        return;
      case "resources/list":
        await sendResult(message.id, {
          resources: CONNECT_DOC_RESOURCES.map(({ uri, name, description, mimeType }) => ({
            uri,
            name,
            description,
            mimeType,
          })),
        });
        return;
      case "resources/read": {
        const uri = isPlainObject(message.params) && typeof message.params.uri === "string"
          ? message.params.uri
          : undefined;
        if (uri === undefined || uri.trim() === "") {
          await sendError(message.id, ErrorCode.InvalidParams, "Missing required resource uri.");
          return;
        }
        const resource = CONNECT_DOC_BY_URI.get(uri);
        if (!resource) {
          await sendError(message.id, ErrorCode.InvalidParams, `Unknown resource URI: ${uri}`);
          return;
        }
        await sendResult(message.id, {
          contents: [{
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          }],
        });
        return;
      }
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

  try {
    await transport.start();

    await new Promise<void>(resolve => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        stdin.off("end", done);
        stdin.off("close", done);
        sessionController.signal.removeEventListener("abort", done);
        resolve();
      };
      if (stdin.readableEnded || stdin.destroyed || sessionController.signal.aborted) {
        done();
        return;
      }
      stdin.once("end", done);
      stdin.once("close", done);
      sessionController.signal.addEventListener("abort", done, { once: true });
    });

    await Promise.allSettled([...pending]);
  } finally {
    sessionController.abort();
    options.signal?.removeEventListener("abort", onExternalAbort);
    await transport.close().catch(() => {});
  }
  return 0;
}
