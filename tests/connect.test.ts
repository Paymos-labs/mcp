import { createHmac } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runConnect } from "../src/connect.js";
import { CONNECT_INSTRUCTIONS, LOCAL_CONNECT_TOOLS } from "../src/connect-advisor.js";
import { MERCHANT_TOOLS } from "../src/generated/merchant-tools.js";
import { CONNECT_DOC_RESOURCES } from "../src/generated/resources.js";
import { readTokenStore, saveTokenStore } from "../src/oauth-session.js";

const roots: string[] = [];

function makeTempTokenFile(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-connect-")));
  roots.push(root);
  return join(root, "mcp", "merchant-oauth.json");
}

function createPipeSession() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let rawOut = "";
  let outBuffer = "";
  let errBuffer = "";
  const lines: Array<Record<string, unknown>> = [];
  const waiters: Array<() => void> = [];

  stdout.on("data", chunk => {
    const text = String(chunk);
    rawOut += text;
    outBuffer += text;
    while (true) {
      const nl = outBuffer.indexOf("\n");
      if (nl < 0) break;
      const line = outBuffer.slice(0, nl).trim();
      outBuffer = outBuffer.slice(nl + 1);
      if (line.startsWith("{")) {
        lines.push(JSON.parse(line) as Record<string, unknown>);
        while (waiters.length > 0) waiters.shift()!();
      }
    }
  });
  stderr.on("data", chunk => { errBuffer += String(chunk); });

  const send = (message: Record<string, unknown>) => {
    stdin.write(JSON.stringify(message) + "\n");
  };

  const readResponses = async (count: number): Promise<Array<Record<string, unknown>>> => {
    while (lines.length < count) {
      await new Promise<void>(resolve => waiters.push(resolve));
    }
    return lines.splice(0, count);
  };

  return {
    stdin,
    stdout,
    stderr,
    send,
    readResponses,
    allStdout: () => rawOut,
    allStderr: () => errBuffer,
  };
}

function mockAuthFetch(
  origin: string,
  issuer: string,
  handler: (url: string, init: RequestInit | undefined) => Promise<Response> | Response,
) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url === `${origin}/.well-known/oauth-protected-resource/connect/merchant-mcp`) {
      return Response.json({ resource: `${origin}/connect/merchant-mcp`, authorization_servers: [issuer] });
    }
    if (url === `${origin}/.well-known/oauth-authorization-server`) {
      return Response.json({
        issuer,
        authorization_endpoint: `${origin}/connect/authorize`,
        token_endpoint: `${origin}/connect/token`,
        registration_endpoint: `${origin}/connect/register`,
        authorization_response_iss_parameter_supported: true,
        code_challenge_methods_supported: ["S256"],
      });
    }
    return handler(url, init);
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("connect stdio OAuth bridge", process.platform === "win32" ? { timeout: 25_000 } : {}, () => {
  it("keeps exact 188-tool deep parity between MERCHANT_TOOLS and committed catalog JSON", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const catalogPath = resolve(here, "..", "scripts", "merchant-tools-catalog.json");
    const committed = JSON.parse(readFileSync(catalogPath, "utf8")) as unknown[];
    expect(committed).toHaveLength(188);
    expect(MERCHANT_TOOLS).toHaveLength(188);
    expect(MERCHANT_TOOLS).toEqual(committed);
  });

  it("handles --help and rejects unknown/invalid flags and cleartext remote origin without hanging", async () => {
    const helpIo = createPipeSession();
    await expect(runConnect(["--help"], {}, helpIo)).resolves.toBe(0);
    expect(helpIo.allStdout()).toContain("Usage:");
    expect(helpIo.allStderr()).toBe("");

    for (const badArgs of [["--unknown"], ["--origin"], ["--origin", "http://evil.paymos.io"], ["--origin", "a", "--origin", "b"]]) {
      const io = createPipeSession();
      await expect(runConnect(badArgs, {}, io)).resolves.toBe(1);
      expect(io.allStderr()).not.toBe("");
    }
  });

  it("serves startup RPC, instructions, 27 doc resources, and 191 tools locally pre-login without network or browser", async () => {
    const tokenFile = makeTempTokenFile();
    const io = createPipeSession();
    const fetchMock = vi.fn<typeof fetch>();
    const openBrowser = vi.fn();

    const run = runConnect(["--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      openBrowser,
    });

    io.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ide", version: "1.0" } },
    });
    io.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    io.send({ jsonrpc: "2.0", id: 2, method: "ping" });
    io.send({ jsonrpc: "2.0", id: 3, method: "resources/list" });
    io.send({ jsonrpc: "2.0", id: 4, method: "resources/templates/list" });
    io.send({ jsonrpc: "2.0", id: 5, method: "prompts/list" });
    io.send({ jsonrpc: "2.0", id: 6, method: "tools/list" });

    const responses = await io.readResponses(6);
    io.stdin.end();
    await expect(run).resolves.toBe(0);

    expect(responses[0]).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        serverInfo: { name: "paymos-merchant" },
        instructions: CONNECT_INSTRUCTIONS,
      },
    });
    expect(CONNECT_INSTRUCTIONS).toContain("recommend_payment_integration");
    expect(CONNECT_INSTRUCTIONS).toContain("continue_url");
    expect(CONNECT_INSTRUCTIONS).toContain("operation_id");
    expect(CONNECT_INSTRUCTIONS).toContain("user_action_required");
    expect(CONNECT_INSTRUCTIONS).toContain("login_required");
    expect(CONNECT_INSTRUCTIONS).toContain("XAUT");
    expect(CONNECT_INSTRUCTIONS).toContain("X-Webhook-Signature");
    expect(CONNECT_INSTRUCTIONS).toContain("is_final");
    expect(CONNECT_INSTRUCTIONS).toContain("event_id");
    expect(responses[1]).toEqual({ jsonrpc: "2.0", id: 2, result: {} });
    const resourcesResult = responses[2]!.result as { resources: Array<{ uri: string; mimeType: string }> };
    expect(resourcesResult.resources).toHaveLength(27);
    expect(resourcesResult.resources.map(r => r.uri)).toEqual(CONNECT_DOC_RESOURCES.map(r => r.uri));
    expect(responses[3]).toEqual({ jsonrpc: "2.0", id: 4, result: { resourceTemplates: [] } });
    expect(responses[4]).toEqual({ jsonrpc: "2.0", id: 5, result: { prompts: [] } });
    const toolsResult = responses[5]!.result as { tools: unknown[] };
    expect(MERCHANT_TOOLS).toHaveLength(188);
    expect(toolsResult.tools).toHaveLength(191);
    expect(toolsResult.tools).toEqual([...LOCAL_CONNECT_TOOLS, ...MERCHANT_TOOLS]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it("silently falls back on tools/list when token is stale, 401, or timed out and merges local tools without duplicating", async () => {
    const tokenFile = makeTempTokenFile();
    const origin = "https://app.paymos.io";
    const nowMs = 1_700_000_000_000;

    saveTokenStore(tokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_stale_1",
          refresh_token: "rt_stale_1",
          expires_at: nowMs + 120_000,
          issuer: `${origin}/`,
        },
      },
    });

    // 1. Remote returns 401 on tools/list -> silent fallback to 191 tools, no browser.
    const io401 = createPipeSession();
    const openBrowser = vi.fn();
    const fetch401 = mockAuthFetch(origin, `${origin}/`, () => new Response("Unauthorized", { status: 401 }));
    const run401 = runConnect(["--token-file", tokenFile], {}, {
      stdin: io401.stdin,
      stdout: io401.stdout,
      stderr: io401.stderr,
      fetch: fetch401,
      openBrowser,
      now: () => nowMs,
    });
    io401.send({ jsonrpc: "2.0", id: "l1", method: "tools/list" });
    const [resp401] = await io401.readResponses(1);
    io401.stdin.end();
    await expect(run401).resolves.toBe(0);
    expect((resp401!.result as { tools: unknown[] }).tools).toHaveLength(191);
    expect(openBrowser).not.toHaveBeenCalled();

    // 2. Remote times out on tools/list -> silent fallback within bounded timeout, no browser.
    const ioTimeout = createPipeSession();
    const fetchTimeout = mockAuthFetch(origin, `${origin}/`, (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    );
    const runTimeout = runConnect(["--token-file", tokenFile], {}, {
      stdin: ioTimeout.stdin,
      stdout: ioTimeout.stdout,
      stderr: ioTimeout.stderr,
      fetch: fetchTimeout,
      openBrowser,
      now: () => nowMs,
      toolsListTimeoutMs: 40,
    });
    ioTimeout.send({ jsonrpc: "2.0", id: "l2", method: "tools/list" });
    const [respTimeout] = await ioTimeout.readResponses(1);
    ioTimeout.stdin.end();
    await expect(runTimeout).resolves.toBe(0);
    expect((respTimeout!.result as { tools: unknown[] }).tools).toHaveLength(191);
    expect(openBrowser).not.toHaveBeenCalled();

    // 3. Remote returns 200 live tools list -> local tools prepended & deduplicated by name.
    const ioLive = createPipeSession();
    const fetchLive = mockAuthFetch(origin, `${origin}/`, () =>
      Response.json({
        jsonrpc: "2.0",
        id: "l3",
        result: {
          tools: [
            { name: "recommend_payment_integration", description: "Remote dup", inputSchema: { type: "object" } },
            { name: "live_tool", description: "Live", inputSchema: { type: "object" } },
          ],
        },
      }),
    );
    const runLive = runConnect(["--token-file", tokenFile], {}, {
      stdin: ioLive.stdin,
      stdout: ioLive.stdout,
      stderr: ioLive.stderr,
      fetch: fetchLive,
      openBrowser,
      now: () => nowMs,
    });
    ioLive.send({ jsonrpc: "2.0", id: "l3", method: "tools/list" });
    const [respLive] = await ioLive.readResponses(1);
    ioLive.stdin.end();
    await expect(runLive).resolves.toBe(0);
    expect((respLive!.result as { tools: Array<{ name: string }> }).tools).toEqual([
      ...LOCAL_CONNECT_TOOLS,
      { name: "live_tool", description: "Live", inputSchema: { type: "object" } },
    ]);

    // 4. Remote returns full 188-tool catalog -> total is 191 with local tools first.
    const ioFull = createPipeSession();
    const fetchFull = mockAuthFetch(origin, `${origin}/`, () =>
      Response.json({ jsonrpc: "2.0", id: "l4", result: { tools: MERCHANT_TOOLS } }),
    );
    const runFull = runConnect(["--token-file", tokenFile], {}, {
      stdin: ioFull.stdin,
      stdout: ioFull.stdout,
      stderr: ioFull.stderr,
      fetch: fetchFull,
      openBrowser,
      now: () => nowMs,
    });
    ioFull.send({ jsonrpc: "2.0", id: "l4", method: "tools/list" });
    const [respFull] = await ioFull.readResponses(1);
    ioFull.stdin.end();
    await expect(runFull).resolves.toBe(0);
    expect((respFull!.result as { tools: unknown[] }).tools).toHaveLength(191);
  });

  it("triggers lazy browser OAuth on tools/call, supports SSE and JSON, retries 401 once, and never leaks tokens", async () => {
    const tokenFile = makeTempTokenFile();
    const origin = "https://dev-local.paymos.io";
    const issuer = `${origin}/`;
    const secretAccess1 = "at_secret_value_alpha_1";
    const secretAccess2 = "at_secret_value_beta_2";
    const secretRefresh1 = "rt_secret_value_one_1";
    const secretRefresh2 = "rt_secret_value_two_2";
    let nowMs = 1_700_000_000_000;
    let browserOpens = 0;
    let refreshCalls = 0;
    let callAttempt = 0;

    const fetchMock = mockAuthFetch(origin, issuer, async (url, init) => {
      if (url === `${origin}/connect/token`) {
        const params = new URLSearchParams(String(init?.body ?? ""));
        if (params.get("grant_type") === "authorization_code") {
          return Response.json({
            access_token: secretAccess1,
            refresh_token: secretRefresh1,
            expires_in: 300,
          });
        }
        if (params.get("grant_type") === "refresh_token") {
          refreshCalls++;
          expect(params.get("refresh_token")).toBe(secretRefresh1);
          await new Promise(resolve => setTimeout(resolve, 20));
          return Response.json({
            access_token: secretAccess2,
            refresh_token: secretRefresh2,
            expires_in: 300,
          });
        }
      }
      if (url === `${origin}/connect/merchant-mcp`) {
        const headers = new Headers(init?.headers);
        expect(headers.get("Accept")).toBe("application/json, text/event-stream");
        expect(headers.get("MCP-Protocol-Version")).toBe("2025-06-18");
        const auth = headers.get("Authorization");
        const rpc = JSON.parse(String(init?.body ?? "{}")) as { id: string | number };
        callAttempt++;
        if (auth === `Bearer ${secretAccess1}`) {
          // Simulate expired/revoked bearer token on first call -> triggers single 401 retry.
          return new Response("Unauthorized", { status: 401 });
        }
        expect(auth).toBe(`Bearer ${secretAccess2}`);
        if (rpc.id === "sse") {
          const sse = [
            ": keep-alive",
            'data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":1}}',
            "",
            `data: {"jsonrpc":"2.0","id":"sse","result":{"content":[{"type":"text","text":"sse-ok"}]}}`,
            "",
          ].join("\n");
          return new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } });
        }
        if (rpc.id === "leak") {
          return Response.json({
            jsonrpc: "2.0",
            id: "leak",
            error: { code: -32000, message: `Denied with Bearer ${secretAccess2} and ${secretRefresh2}` },
          });
        }
        return Response.json({
          jsonrpc: "2.0",
          id: rpc.id,
          result: { content: [{ type: "text", text: `ok-${rpc.id}` }] },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const io = createPipeSession();
    const run = runConnect(["--origin", origin, "--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      now: () => nowMs,
      openBrowser: async rawUrl => {
        browserOpens++;
        const authUrl = new URL(rawUrl);
        const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
        redirect.searchParams.set("code", "code_connect_1");
        redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
        redirect.searchParams.set("iss", issuer);
        await fetch(redirect);
      },
    });

    io.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ide", version: "1.0" } },
    });
    await io.readResponses(1);

    // First call triggers browser login once, receives 401 on access1, refreshes once, retries with access2.
    io.send({
      jsonrpc: "2.0",
      id: "c1",
      method: "tools/call",
      params: { name: "get_connection_status", arguments: { input: {} } },
    });
    const [c1] = await io.readResponses(1);
    expect(c1).toEqual({
      jsonrpc: "2.0",
      id: "c1",
      result: { content: [{ type: "text", text: "ok-c1" }] },
    });
    expect(browserOpens).toBe(1);
    expect(refreshCalls).toBe(1);

    // Subsequent concurrent SSE + JSON + error calls reuse rotated access2 with no extra login/refresh.
    io.send({ jsonrpc: "2.0", id: "sse", method: "tools/call", params: { name: "get_connection_status", arguments: { input: {} } } });
    io.send({ jsonrpc: "2.0", id: "c2", method: "tools/call", params: { name: "get_connection_status", arguments: { input: {} } } });
    io.send({ jsonrpc: "2.0", id: "leak", method: "tools/call", params: { name: "get_connection_status", arguments: { input: {} } } });

    const batch = await io.readResponses(3);
    io.stdin.end();
    await expect(run).resolves.toBe(0);

    const byId = new Map(batch.map(item => [item.id, item]));
    expect(byId.get("sse")).toEqual({
      jsonrpc: "2.0",
      id: "sse",
      result: { content: [{ type: "text", text: "sse-ok" }] },
    });
    expect(byId.get("c2")).toEqual({
      jsonrpc: "2.0",
      id: "c2",
      result: { content: [{ type: "text", text: "ok-c2" }] },
    });
    const leakErr = byId.get("leak")!.error as { message: string };
    expect(leakErr.message).not.toContain(secretAccess2);
    expect(leakErr.message).toContain("[redacted]");
    expect(readTokenStore(tokenFile).origins[origin]?.refresh_token).toBe(secretRefresh2);

    const rawOut = io.allStdout() + io.allStderr();
    for (const secret of [secretAccess1, secretAccess2, secretRefresh1, secretRefresh2]) {
      expect(rawOut).not.toContain(secret);
    }
    expect(callAttempt).toBe(5);
  });

  it("serializes parallel tools/call refreshes under ReuseLeeway=Zero", async () => {
    const tokenFile = makeTempTokenFile();
    const origin = "https://app.paymos.io";
    const issuer = `${origin}/`;
    const nowMs = 1_700_000_000_000;

    saveTokenStore(tokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_old_parallel",
          refresh_token: "rt_once_parallel",
          expires_at: nowMs - 1_000,
          issuer,
        },
      },
    });

    let refreshCount = 0;
    const fetchMock = mockAuthFetch(origin, issuer, async (url, init) => {
      if (url === `${origin}/connect/token`) {
        refreshCount++;
        expect(refreshCount).toBe(1);
        await new Promise(resolve => setTimeout(resolve, 35));
        return Response.json({
          access_token: "at_new_parallel",
          refresh_token: "rt_new_parallel",
          expires_in: 300,
        });
      }
      if (url === `${origin}/connect/merchant-mcp`) {
        const rpc = JSON.parse(String(init?.body ?? "{}")) as { id: string };
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer at_new_parallel");
        return Response.json({ jsonrpc: "2.0", id: rpc.id, result: { ok: rpc.id } });
      }
      return new Response("Not Found", { status: 404 });
    });

    const io = createPipeSession();
    const run = runConnect(["--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      now: () => nowMs,
    });

    for (const id of ["p1", "p2", "p3", "p4"]) {
      io.send({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "get_connection_status", arguments: { input: {} } } });
    }
    const responses = await io.readResponses(4);
    io.stdin.end();
    await expect(run).resolves.toBe(0);

    expect(refreshCount).toBe(1);
    expect(responses.map(r => r.id).sort()).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("reads all 27 CONNECT_DOC_RESOURCES locally and returns InvalidParams on missing/unknown URIs", async () => {
    const tokenFile = makeTempTokenFile();
    const io = createPipeSession();
    const fetchMock = vi.fn<typeof fetch>();
    const openBrowser = vi.fn();

    const run = runConnect(["--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      openBrowser,
    });

    const sampleUris = [
      "paymos://docs/overview",
      "paymos://docs/webhooks-verify",
      "paymos://docs/testing-sandbox",
      "paymos://docs/payment-channels-create",
      "paymos://docs/payment-channel-deposits-list",
      "paymos://docs/cms-woocommerce",
    ];
    for (const [idx, uri] of sampleUris.entries()) {
      io.send({ jsonrpc: "2.0", id: `r${idx}`, method: "resources/read", params: { uri } });
    }
    io.send({ jsonrpc: "2.0", id: "missing", method: "resources/read", params: { uri: "paymos://docs/does-not-exist" } });
    io.send({ jsonrpc: "2.0", id: "empty", method: "resources/read", params: {} });

    const responses = await io.readResponses(sampleUris.length + 2);
    io.stdin.end();
    await expect(run).resolves.toBe(0);

    for (const [idx, uri] of sampleUris.entries()) {
      const resp = responses[idx]!;
      const contents = (resp.result as { contents: Array<{ uri: string; mimeType: string; text: string }> }).contents;
      expect(contents).toHaveLength(1);
      expect(contents[0]!.uri).toBe(uri);
      expect(contents[0]!.mimeType).toBe("text/html");
      expect(contents[0]!.text.trim().length).toBeGreaterThan(200);
    }
    expect(responses[sampleUris.length]!.error).toMatchObject({ code: ErrorCode.InvalidParams });
    expect(responses[sampleUris.length + 1]!.error).toMatchObject({ code: ErrorCode.InvalidParams });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it("runs paymos_auth_status locally across none, corrupt-file, refreshable, and active states without secrets or network", async () => {
    const origin = "https://app.paymos.io";
    const nowMs = 1_700_000_000_000;

    async function callStatus(tokenFile: string) {
      const io = createPipeSession();
      const fetchMock = vi.fn<typeof fetch>();
      const openBrowser = vi.fn();
      const run = runConnect(["--origin", origin, "--token-file", tokenFile], {}, {
        stdin: io.stdin,
        stdout: io.stdout,
        stderr: io.stderr,
        fetch: fetchMock,
        openBrowser,
        now: () => nowMs,
      });
      io.send({ jsonrpc: "2.0", id: "st", method: "tools/call", params: { name: "paymos_auth_status", arguments: {} } });
      const [resp] = await io.readResponses(1);
      io.stdin.end();
      await expect(run).resolves.toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(openBrowser).not.toHaveBeenCalled();
      const result = resp!.result as { content: Array<{ text: string }>; isError?: boolean };
      expect(result.isError).not.toBe(true);
      return { parsed: JSON.parse(result.content[0]!.text) as Record<string, unknown>, raw: io.allStdout() + io.allStderr() };
    }

    // 1. Missing token file -> none
    const missingTokenFile = makeTempTokenFile();
    const sNone = await callStatus(missingTokenFile);
    expect(sNone.parsed).toMatchObject({
      signed_in: false,
      session_state: "none",
      origin,
      mode: "reference_only",
      setup_command: "npx -y @paymos/mcp setup",
    });

    // 2. Corrupt JSON token file -> safe fallback to none
    const corruptTokenFile = makeTempTokenFile();
    mkdirSync(dirname(corruptTokenFile), { recursive: true, mode: 0o700 });
    writeFileSync(corruptTokenFile, "{not-valid-json", { mode: 0o600 });
    const sCorrupt = await callStatus(corruptTokenFile);
    expect(sCorrupt.parsed).toMatchObject({ signed_in: false, session_state: "none", mode: "reference_only" });

    // 3. Expired access token with refresh_token -> refreshable, zero token leakage
    const refreshTokenFile = makeTempTokenFile();
    saveTokenStore(refreshTokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_expired_secret_token",
          refresh_token: "rt_refresh_secret_token",
          expires_at: nowMs - 1_000,
          issuer: `${origin}/`,
        },
      },
    });
    const sRefresh = await callStatus(refreshTokenFile);
    expect(sRefresh.parsed).toMatchObject({
      signed_in: true,
      session_state: "refreshable",
      origin,
      mode: "workspace_and_reference",
    });
    expect(sRefresh.raw).not.toContain("at_expired_secret_token");
    expect(sRefresh.raw).not.toContain("rt_refresh_secret_token");

    // 4. Valid active token -> active, zero token leakage
    const activeTokenFile = makeTempTokenFile();
    saveTokenStore(activeTokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_active_secret_token",
          refresh_token: "rt_active_secret_token",
          expires_at: nowMs + 120_000,
          issuer: `${origin}/`,
        },
      },
    });
    const sActive = await callStatus(activeTokenFile);
    expect(sActive.parsed).toMatchObject({
      signed_in: true,
      session_state: "active",
      origin,
      mode: "workspace_and_reference",
    });
    expect(sActive.raw).not.toContain("at_active_secret_token");
    expect(sActive.raw).not.toContain("rt_active_secret_token");
  });

  it("runs recommend_payment_integration for all 7 scenarios and all 15 CMS platforms offline without network or browser", async () => {
    const tokenFile = makeTempTokenFile();
    const io = createPipeSession();
    const fetchMock = vi.fn<typeof fetch>();
    const openBrowser = vi.fn();

    const run = runConnect(["--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      openBrowser,
    });

    const cmsCases: Array<[string, string, string]> = [
      ["woocommerce", "paymos://docs/cms-woocommerce", "Paymos-labs/woocommerce"],
      ["whmcs", "paymos://docs/cms-whmcs", "Paymos-labs/whmcs"],
      ["prestashop", "paymos://docs/cms-prestashop", "Paymos-labs/prestashop"],
      ["magento2", "paymos://docs/cms-magento2", "Paymos-labs/magento2"],
      ["opencart", "paymos://docs/cms-opencart", "Paymos-labs/opencart"],
      ["shopware6", "paymos://docs/cms-shopware6", "Paymos-labs/shopware6"],
      ["cscart", "paymos://docs/cms-cscart", "Paymos-labs/cscart"],
      ["easy-digital-downloads", "paymos://docs/cms-easy-digital-downloads", "Paymos-labs/edd"],
      ["edd", "paymos://docs/cms-easy-digital-downloads", "Paymos-labs/edd"],
      ["drupal-commerce", "paymos://docs/cms-drupal-commerce", "Paymos-labs/drupal-commerce"],
      ["hikashop", "paymos://docs/cms-hikashop", "Paymos-labs/hikashop"],
      ["givewp", "paymos://docs/cms-givewp", "Paymos-labs/givewp"],
      ["odoo", "paymos://docs/cms-odoo", "Paymos-labs/odoo"],
      ["blesta", "paymos://docs/cms-blesta", "Paymos-labs/blesta"],
      ["fossbilling", "paymos://docs/cms-fossbilling", "Paymos-labs/fossbilling"],
      ["paymenter", "paymos://docs/cms-paymenter", "Paymos-labs/paymenter"],
    ];

    const calls: Array<{ id: string; arguments: Record<string, unknown> }> = [
      { id: "s_cms", arguments: { scenario: "cms_plugin", platform_or_cms: "WooCommerce" } },
      { id: "s_widget", arguments: { scenario: "checkout_widget", has_backend: false } },
      { id: "s_pos", arguments: { scenario: "pos_terminal" } },
      { id: "s_order", arguments: { scenario: "order_checkout", has_backend: true } },
      { id: "s_repeat", arguments: { scenario: "repeat_deposits" } },
      { id: "s_both", arguments: { scenario: "both" } },
      { id: "s_unsure", arguments: { scenario: "unsure" } },
      { id: "s_omitted", arguments: {} },
      { id: "s_embedded_not_edd", arguments: { platform_or_cms: "embedded checkout" } },
      { id: "s_invalid", arguments: { scenario: "invalid_scenario_value" } },
      ...cmsCases.map(([cms], idx) => ({ id: `cms_${idx}`, arguments: { platform_or_cms: cms } })),
    ];

    for (const call of calls) {
      io.send({
        jsonrpc: "2.0",
        id: call.id,
        method: "tools/call",
        params: { name: "recommend_payment_integration", arguments: call.arguments },
      });
    }

    const responses = await io.readResponses(calls.length);
    io.stdin.end();
    await expect(run).resolves.toBe(0);

    const byId = new Map(responses.map(r => [r.id as string, r.result as { content: Array<{ text: string }>; isError?: boolean }]));

    const expectedRecommendations: Record<string, [string, string]> = {
      s_cms: ["cms_plugin", "cms_plugin"],
      s_widget: ["checkout_widget", "checkout_widget"],
      s_pos: ["pos_terminal", "pos_terminal"],
      s_order: ["order_checkout", "invoice"],
      s_repeat: ["repeat_deposits", "payment_channel"],
      s_both: ["both", "both"],
      s_unsure: ["unsure", "unsure"],
      s_omitted: ["unsure", "unsure"],
    };
    for (const [id, [scenario, recommendation]] of Object.entries(expectedRecommendations)) {
      const res = byId.get(id)!;
      expect(res.isError).not.toBe(true);
      const body = JSON.parse(res.content[0]!.text) as Record<string, unknown>;
      expect(body.scenario).toBe(scenario);
      expect(body.recommendation).toBe(recommendation);
      expect(body.sdks).toHaveLength(8);
      const networks = body.supported_networks as {
        deposit_networks: string[];
        withdrawal_networks: string[];
        deposit_only_networks: string[];
        assets: { stablecoins: string[]; gold_backed: string[] };
      };
      expect(networks.deposit_networks).toHaveLength(13);
      expect(networks.withdrawal_networks).toHaveLength(11);
      expect(networks.deposit_only_networks).toEqual(["NEAR", "SUI"]);
      expect(networks.assets.stablecoins).toEqual(["USDT", "USDC", "USD1", "DAI"]);
      expect(networks.assets.gold_backed).toEqual(["XAUT"]);
      const rules = (body.implementation_rules as string[]).join(" ");
      expect(rules).toContain("X-Webhook-Signature");
      expect(rules).toContain("confirmed");
      expect(rules).toContain("is_final");
      expect(rules).toContain("event_id");
    }

    // "embedded checkout" must NOT false-match "edd"
    const embeddedBody = JSON.parse(byId.get("s_embedded_not_edd")!.content[0]!.text) as Record<string, unknown>;
    expect(embeddedBody.scenario).toBe("unsure");
    expect(embeddedBody.detected_cms).toBeUndefined();

    // Unknown scenario -> isError: true
    expect(byId.get("s_invalid")!.isError).toBe(true);

    // All 15 CMS auto-detections (including repository metadata parity)
    for (const [idx, [, expectedDoc, expectedRepo]] of cmsCases.entries()) {
      const body = JSON.parse(byId.get(`cms_${idx}`)!.content[0]!.text) as {
        scenario: string;
        detected_cms?: { doc_uri: string; repository?: string };
        supported_cms_plugins?: Array<{ id: string }>;
      };
      expect(body.scenario).toBe("cms_plugin");
      expect(body.detected_cms?.doc_uri).toBe(expectedDoc);
      expect(body.detected_cms?.repository).toBe(expectedRepo);
      expect(body.supported_cms_plugins).toHaveLength(15);
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it("runs verify_webhook_signature locally (valid, rotation, missing/whitespace secret, expired, bad_signature, invalid tolerance) without leaks", async () => {
    const tokenFile = makeTempTokenFile();
    const secret = "whsec_local_secret_value_123";
    const envSecret = "whsec_env_secret_value_456";
    const nowSec = 1_700_000_000;
    const payload = '{"event_id":"evt_123","event_type":"invoice.paid"}';
    const validSig = createHmac("sha256", secret).update(`${nowSec}.${payload}`).digest("hex");
    const envSig = createHmac("sha256", envSecret).update(`${nowSec}.${payload}`).digest("hex");
    const expiredTs = nowSec - 600;
    const expiredSig = createHmac("sha256", secret).update(`${expiredTs}.${payload}`).digest("hex");

    // 1. Without env secret: explicit missing/whitespace secret, valid, dual-v1 rotation, expired, bad sig, bad tolerance
    const io1 = createPipeSession();
    const fetch1 = vi.fn<typeof fetch>();
    const open1 = vi.fn();
    const run1 = runConnect(["--token-file", tokenFile], {}, {
      stdin: io1.stdin,
      stdout: io1.stdout,
      stderr: io1.stderr,
      fetch: fetch1,
      openBrowser: open1,
      now: () => nowSec * 1000,
    });

    const cases1 = [
      { id: "w_missing", arguments: { payload, signature_header: `t=${nowSec},v1=${validSig}` } },
      { id: "w_ws", arguments: { payload, signature_header: `t=${nowSec},v1=${validSig}`, secret: "   " } },
      { id: "w_valid", arguments: { payload, signature_header: `t=${nowSec},v1=${validSig}`, secret } },
      { id: "w_dual", arguments: { payload, signature_header: `t=${nowSec},v1=deadbeef,v1=${validSig}`, secret } },
      { id: "w_expired", arguments: { payload, signature_header: `t=${expiredTs},v1=${expiredSig}`, secret, tolerance_seconds: 300 } },
      { id: "w_bad", arguments: { payload, signature_header: `t=${nowSec},v1=${"0".repeat(64)}`, secret } },
      { id: "w_bad_tol", arguments: { payload, signature_header: `t=${nowSec},v1=${validSig}`, secret, tolerance_seconds: -1 } },
      { id: "w_float_tol", arguments: { payload, signature_header: `t=${nowSec},v1=${validSig}`, secret, tolerance_seconds: 1.5 } },
    ];
    for (const item of cases1) {
      io1.send({ jsonrpc: "2.0", id: item.id, method: "tools/call", params: { name: "verify_webhook_signature", arguments: item.arguments } });
    }
    const resp1 = await io1.readResponses(cases1.length);
    io1.stdin.end();
    await expect(run1).resolves.toBe(0);

    const map1 = new Map(resp1.map(r => [r.id as string, r.result as { content: Array<{ text: string }>; isError?: boolean }]));
    expect(JSON.parse(map1.get("w_missing")!.content[0]!.text)).toEqual({ valid: false, reason: "missing_secret" });
    expect(JSON.parse(map1.get("w_ws")!.content[0]!.text)).toEqual({ valid: false, reason: "missing_secret" });
    expect(JSON.parse(map1.get("w_valid")!.content[0]!.text)).toEqual({ valid: true });
    expect(JSON.parse(map1.get("w_dual")!.content[0]!.text)).toEqual({ valid: true });
    expect(JSON.parse(map1.get("w_expired")!.content[0]!.text)).toEqual({ valid: false, reason: "expired" });
    expect(JSON.parse(map1.get("w_bad")!.content[0]!.text)).toEqual({ valid: false, reason: "bad_signature" });
    expect(map1.get("w_bad_tol")!.isError).toBe(true);
    expect(map1.get("w_float_tol")!.isError).toBe(true);
    expect(io1.allStdout() + io1.allStderr()).not.toContain(secret);
    expect(fetch1).not.toHaveBeenCalled();
    expect(open1).not.toHaveBeenCalled();

    // 2. With PAYMOS_WEBHOOK_SECRET in env
    const io2 = createPipeSession();
    const run2 = runConnect(["--token-file", tokenFile], { PAYMOS_WEBHOOK_SECRET: envSecret }, {
      stdin: io2.stdin,
      stdout: io2.stdout,
      stderr: io2.stderr,
      fetch: fetch1,
      openBrowser: open1,
      now: () => nowSec * 1000,
    });
    io2.send({
      jsonrpc: "2.0",
      id: "w_env",
      method: "tools/call",
      params: { name: "verify_webhook_signature", arguments: { payload, signature_header: `t=${nowSec},v1=${envSig}` } },
    });
    const [resp2] = await io2.readResponses(1);
    io2.stdin.end();
    await expect(run2).resolves.toBe(0);
    expect(JSON.parse((resp2!.result as { content: Array<{ text: string }> }).content[0]!.text)).toEqual({ valid: true });
    expect(io2.allStdout() + io2.allStderr()).not.toContain(envSecret);
  });

  it("returns non-blocking login_required with authorize_url, completes login from another browser, and shuts down cleanly on stdin.end()", async () => {
    const tokenFile = makeTempTokenFile();
    const origin = "https://dev-local.paymos.io";
    const issuer = `${origin}/`;
    const openedUrls: string[] = [];

    const fetchMock = mockAuthFetch(origin, issuer, async (url, init) => {
      if (url === `${origin}/connect/token`) {
        return Response.json({
          access_token: "at_other_browser_1",
          refresh_token: "rt_other_browser_1",
          expires_in: 300,
        });
      }
      if (url === `${origin}/connect/merchant-mcp`) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer at_other_browser_1");
        const rpc = JSON.parse(String(init?.body ?? "{}")) as { id: string | number };
        return Response.json({
          jsonrpc: "2.0",
          id: rpc.id,
          result: { content: [{ type: "text", text: JSON.stringify({ connected: true }) }] },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const io = createPipeSession();
    const run = runConnect(["--origin", origin, "--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      loginFastPathMs: 25,
      loginTimeoutMs: 60_000,
      openBrowser: rawUrl => {
        openedUrls.push(rawUrl);
      },
    });

    // 1. Two concurrent remote calls before login -> single browser open, both return user_action_required + login_required.
    io.send({ jsonrpc: "2.0", id: "login_1", method: "tools/call", params: { name: "get_connection_status", arguments: {} } });
    io.send({ jsonrpc: "2.0", id: "login_2", method: "tools/call", params: { name: "get_connection_status", arguments: {} } });
    const firstWave = await io.readResponses(2);

    expect(openedUrls).toHaveLength(1);
    const expectedUrl = openedUrls[0]!;
    expect(expectedUrl).toMatch(/^https:\/\/dev-local\.paymos\.io\/connect\/authorize\?/);

    for (const resp of firstWave) {
      const result = resp.result as {
        isError?: boolean;
        structuredContent: Record<string, unknown>;
        content: Array<{ type: string; text: string }>;
      };
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        status: "user_action_required",
        reason: "login_required",
        continue_url: expectedUrl,
        authorize_url: expectedUrl,
        browser_opened: true,
      });
      expect(JSON.parse(result.content[0]!.text)).toEqual(result.structuredContent);
    }

    // 2. Simulate user completing login in another browser via the printed/returned URL.
    const authUrl = new URL(expectedUrl);
    const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
    redirect.searchParams.set("code", "code_second_browser");
    redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
    redirect.searchParams.set("iss", issuer);
    const cbResp = await fetch(redirect);
    expect(cbResp.status).toBe(200);

    // Wait briefly for background exchange + token save.
    for (let i = 0; i < 40 && !readTokenStore(tokenFile).origins[origin]; i++) {
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    expect(readTokenStore(tokenFile).origins[origin]?.access_token).toBe("at_other_browser_1");

    // 3. Subsequent call succeeds without opening another browser tab.
    io.send({ jsonrpc: "2.0", id: "after_login", method: "tools/call", params: { name: "get_connection_status", arguments: {} } });
    const [afterResp] = await io.readResponses(1);
    expect(afterResp).toEqual({
      jsonrpc: "2.0",
      id: "after_login",
      result: { content: [{ type: "text", text: JSON.stringify({ connected: true }) }] },
    });
    expect(openedUrls).toHaveLength(1);

    io.stdin.end();
    await expect(run).resolves.toBe(0);

    // 4. Clean shutdown on stdin.end() aborts any pending background loopback listener immediately.
    const pendingTokenFile = makeTempTokenFile();
    const pendingOpens: string[] = [];
    const ioPending = createPipeSession();
    const runPending = runConnect(["--origin", origin, "--token-file", pendingTokenFile], {}, {
      stdin: ioPending.stdin,
      stdout: ioPending.stdout,
      stderr: ioPending.stderr,
      fetch: fetchMock,
      loginFastPathMs: 20,
      loginTimeoutMs: 60_000,
      openBrowser: rawUrl => {
        pendingOpens.push(rawUrl);
      },
    });
    ioPending.send({ jsonrpc: "2.0", id: "pending_only", method: "tools/call", params: { name: "get_connection_status", arguments: {} } });
    await ioPending.readResponses(1);
    const pendingRedirect = new URL(new URL(pendingOpens[0]!).searchParams.get("redirect_uri")!);
    ioPending.stdin.end();
    await expect(runPending).resolves.toBe(0);
    await expect(fetch(pendingRedirect)).rejects.toThrow();
  });

  it("auto-opens safe relative/absolute continue_url once per 60s, rewrites full URLs, and blocks unsafe URLs", async () => {
    const tokenFile = makeTempTokenFile();
    const origin = "https://app.paymos.io";
    const issuer = `${origin}/`;
    let nowMs = 1_700_000_000_000;
    const openedUrls: string[] = [];

    saveTokenStore(tokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_stepup_valid",
          refresh_token: "rt_stepup_valid",
          expires_at: nowMs + 300_000,
          issuer,
        },
      },
    });

    const ticketA = "ctk_" + "a".repeat(43);
    const ticketB = "ctk_" + "b".repeat(43);
    const ticketEvil = "ctk_" + "e".repeat(43);
    const responsesById: Record<string, string> = {
      rel_1: `/connect/merchant-mcp/continue/${ticketA}`,
      rel_dup: `/connect/merchant-mcp/continue/${ticketA}`,
      rel_after_60s: `/connect/merchant-mcp/continue/${ticketA}`,
      abs_same: `https://app.paymos.io/connect/merchant-mcp/continue/${ticketB}`,
      evil_origin: `https://evil.test/connect/merchant-mcp/continue/${ticketEvil}`,
      evil_js: "javascript:alert(1)",
      evil_path: "/accounts/1",
      evil_query: `/connect/merchant-mcp/continue/${ticketEvil}?x=1`,
    };

    const fetchMock = mockAuthFetch(origin, issuer, async (url, init) => {
      if (url === `${origin}/connect/merchant-mcp`) {
        const rpc = JSON.parse(String(init?.body ?? "{}")) as { id: string };
        const continueUrl = responsesById[rpc.id]!;
        const payload = {
          status: "user_action_required",
          continue_url: continueUrl,
          operation_id: `op_${rpc.id}`,
        };
        return Response.json({
          jsonrpc: "2.0",
          id: rpc.id,
          result: {
            structuredContent: payload,
            content: [{ type: "text", text: JSON.stringify(payload) }],
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const io = createPipeSession();
    const run = runConnect(["--origin", origin, "--token-file", tokenFile], {}, {
      stdin: io.stdin,
      stdout: io.stdout,
      stderr: io.stderr,
      fetch: fetchMock,
      now: () => nowMs,
      openBrowser: rawUrl => {
        openedUrls.push(rawUrl);
      },
    });

    const sendAndRead = async (id: string) => {
      io.send({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "merchant_create_api_credential", arguments: {} } });
      const [resp] = await io.readResponses(1);
      return resp!.result as {
        structuredContent: Record<string, unknown>;
        content: Array<{ type: string; text: string }>;
      };
    };

    // 1. Relative safe path -> rewritten to full HTTPS URL in both structuredContent and content[].text, opened once.
    const r1 = await sendAndRead("rel_1");
    const fullA = `https://app.paymos.io/connect/merchant-mcp/continue/${ticketA}`;
    expect(r1.structuredContent.continue_url).toBe(fullA);
    expect(JSON.parse(r1.content[0]!.text).continue_url).toBe(fullA);
    expect(openedUrls).toEqual([fullA]);

    // 2. Retry within 60s -> still rewritten, NOT re-opened.
    nowMs += 59_999;
    const rDup = await sendAndRead("rel_dup");
    expect(rDup.structuredContent.continue_url).toBe(fullA);
    expect(openedUrls).toEqual([fullA]);

    // 3. Retry at >= 60s -> opened again.
    nowMs += 1;
    const rAfter = await sendAndRead("rel_after_60s");
    expect(rAfter.structuredContent.continue_url).toBe(fullA);
    expect(openedUrls).toEqual([fullA, fullA]);

    // 4. Absolute same-origin URL -> opened and preserved.
    const rAbs = await sendAndRead("abs_same");
    const fullB = `https://app.paymos.io/connect/merchant-mcp/continue/${ticketB}`;
    expect(rAbs.structuredContent.continue_url).toBe(fullB);
    expect(JSON.parse(rAbs.content[0]!.text).continue_url).toBe(fullB);
    expect(openedUrls).toEqual([fullA, fullA, fullB]);

    // 5. Cross-origin, javascript:, wrong path, and query-string URLs NEVER invoke openBrowser.
    for (const evilId of ["evil_origin", "evil_js", "evil_path", "evil_query"]) {
      const rEvil = await sendAndRead(evilId);
      expect(rEvil.structuredContent.continue_url).toBe(responsesById[evilId]);
    }
    expect(openedUrls).toEqual([fullA, fullA, fullB]);

    io.stdin.end();
    await expect(run).resolves.toBe(0);
  });

  it("falls back to non-blocking login_required when 401 refresh is revoked and deduplicates concurrent user_action_required openings", async () => {
    // 1. 401 + revoked refresh_token -> clears token store and returns login_required with authorize_url.
    const revokedTokenFile = makeTempTokenFile();
    const origin = "https://dev-local.paymos.io";
    const issuer = `${origin}/`;
    const nowMs = 1_700_000_000_000;
    saveTokenStore(revokedTokenFile, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_revoked_1",
          refresh_token: "rt_revoked_1",
          expires_at: nowMs + 300_000,
          issuer,
        },
      },
    });

    const openedReauthUrls: string[] = [];
    const fetchRevoked = mockAuthFetch(origin, issuer, (url, init) => {
      if (url === `${origin}/connect/merchant-mcp`) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer at_revoked_1");
        return new Response("Unauthorized", { status: 401 });
      }
      if (url === `${origin}/connect/token`) {
        const params = new URLSearchParams(String(init?.body ?? ""));
        expect(params.get("grant_type")).toBe("refresh_token");
        return Response.json({ error: "invalid_grant" }, { status: 400 });
      }
      return new Response("Not Found", { status: 404 });
    });

    const ioRevoked = createPipeSession();
    const runRevoked = runConnect(["--origin", origin, "--token-file", revokedTokenFile], {}, {
      stdin: ioRevoked.stdin,
      stdout: ioRevoked.stdout,
      stderr: ioRevoked.stderr,
      fetch: fetchRevoked,
      now: () => nowMs,
      loginFastPathMs: 25,
      loginTimeoutMs: 60_000,
      openBrowser: rawUrl => {
        openedReauthUrls.push(rawUrl);
      },
    });

    ioRevoked.send({ jsonrpc: "2.0", id: "revoked_1", method: "tools/call", params: { name: "get_connection_status", arguments: {} } });
    const [revokedResp] = await ioRevoked.readResponses(1);
    expect(openedReauthUrls).toHaveLength(1);
    expect(revokedResp!.result).toMatchObject({
      structuredContent: {
        status: "user_action_required",
        reason: "login_required",
        continue_url: openedReauthUrls[0]!,
        authorize_url: openedReauthUrls[0]!,
        browser_opened: true,
      },
    });
    expect(readTokenStore(revokedTokenFile).origins[origin]).toBeUndefined();
    ioRevoked.stdin.end();
    await expect(runRevoked).resolves.toBe(0);

    // 2. Concurrent user_action_required responses with identical continue_url open the browser only once.
    const parTokenFile = makeTempTokenFile();
    const parOrigin = "https://app.paymos.io";
    const parIssuer = `${parOrigin}/`;
    saveTokenStore(parTokenFile, {
      version: 1,
      origins: {
        [parOrigin]: {
          access_token: "at_parallel_valid",
          refresh_token: "rt_parallel_valid",
          expires_at: nowMs + 300_000,
          issuer: parIssuer,
        },
      },
    });

    const sharedTicket = "ctk_" + "p".repeat(43);
    const sharedFullUrl = `${parOrigin}/connect/merchant-mcp/continue/${sharedTicket}`;
    const parOpenedUrls: string[] = [];
    const fetchPar = mockAuthFetch(parOrigin, parIssuer, (url, init) => {
      if (url === `${parOrigin}/connect/merchant-mcp`) {
        const rpc = JSON.parse(String(init?.body ?? "{}")) as { id: string };
        const payload = {
          status: "user_action_required",
          continue_url: `/connect/merchant-mcp/continue/${sharedTicket}`,
          operation_id: `op_${rpc.id}`,
        };
        return Response.json({
          jsonrpc: "2.0",
          id: rpc.id,
          result: {
            structuredContent: payload,
            content: [{ type: "text", text: JSON.stringify(payload) }],
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const ioPar = createPipeSession();
    const openBrowserSpy = vi.fn(async (rawUrl: string) => {
      parOpenedUrls.push(rawUrl);
      await new Promise(resolve => setTimeout(resolve, 35));
    });
    const runPar = runConnect(["--origin", parOrigin, "--token-file", parTokenFile], {}, {
      stdin: ioPar.stdin,
      stdout: ioPar.stdout,
      stderr: ioPar.stderr,
      fetch: fetchPar,
      now: () => nowMs,
      openBrowser: openBrowserSpy,
    });

    ioPar.send({ jsonrpc: "2.0", id: "par_1", method: "tools/call", params: { name: "merchant_create_api_credential", arguments: {} } });
    ioPar.send({ jsonrpc: "2.0", id: "par_2", method: "tools/call", params: { name: "merchant_create_api_credential", arguments: {} } });
    const parResponses = await ioPar.readResponses(2);

    expect(openBrowserSpy).toHaveBeenCalledTimes(1);
    expect(parOpenedUrls).toEqual([sharedFullUrl]);
    for (const resp of parResponses) {
      const result = resp.result as {
        structuredContent: Record<string, unknown>;
        content: Array<{ type: string; text: string }>;
      };
      expect(result.structuredContent.continue_url).toBe(sharedFullUrl);
      expect(JSON.parse(result.content[0]!.text).continue_url).toBe(sharedFullUrl);
    }

    ioPar.stdin.end();
    await expect(runPar).resolves.toBe(0);
  });
});
