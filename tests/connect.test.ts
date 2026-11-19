import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runConnect } from "../src/connect.js";
import { MERCHANT_TOOLS } from "../src/generated/merchant-tools.js";
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

  it("serves startup RPC and 188 tools locally pre-login without network or browser", async () => {
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
      result: { protocolVersion: "2025-06-18", serverInfo: { name: "paymos-merchant" } },
    });
    expect(responses[1]).toEqual({ jsonrpc: "2.0", id: 2, result: {} });
    expect(responses[2]).toEqual({ jsonrpc: "2.0", id: 3, result: { resources: [] } });
    expect(responses[3]).toEqual({ jsonrpc: "2.0", id: 4, result: { resourceTemplates: [] } });
    expect(responses[4]).toEqual({ jsonrpc: "2.0", id: 5, result: { prompts: [] } });
    const toolsResult = responses[5]!.result as { tools: unknown[] };
    expect(toolsResult.tools).toHaveLength(188);
    expect(toolsResult.tools).toEqual(MERCHANT_TOOLS);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it("silently falls back on tools/list when token is stale, 401, or timed out without opening browser", async () => {
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

    // 1. Remote returns 401 on tools/list -> silent fallback to 188 tools, no browser.
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
    expect((resp401!.result as { tools: unknown[] }).tools).toHaveLength(188);
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
    expect((respTimeout!.result as { tools: unknown[] }).tools).toHaveLength(188);
    expect(openBrowser).not.toHaveBeenCalled();

    // 3. Remote returns 200 live tools list -> forwarded cleanly.
    const ioLive = createPipeSession();
    const fetchLive = mockAuthFetch(origin, `${origin}/`, () =>
      Response.json({ jsonrpc: "2.0", id: "l3", result: { tools: [{ name: "live_tool", description: "Live", inputSchema: { type: "object" } }] } }),
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
      { name: "live_tool", description: "Live", inputSchema: { type: "object" } },
    ]);
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
});
