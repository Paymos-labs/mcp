import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireConnectAccessToken, defaultTokenPath, loginWithBrowser, openUrlInBrowser, readTokenStore,
  requireAccessToken, resolveSafeContinuationUrl, saveTokenStore, tryGetAccessToken, validateOrigin,
  type TokenStore,
} from "../src/oauth-session.js";
import { writePrivateFile, withAsyncFileLock } from "../src/private-state.js";

const roots: string[] = [];

function makeTempRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-oauth-")));
  roots.push(root);
  return root;
}

function windowsAcl(path: string, directory: boolean, share = false) {
  const windows = process.env.SystemRoot!;
  const script = String.raw`
using namespace System.IO
using namespace System.Security.AccessControl
using namespace System.Security.Principal

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$path = $env:PAYMOS_TEST_STATE_PATH
$directory = $env:PAYMOS_TEST_STATE_DIRECTORY -eq '1'
$sid = [WindowsIdentity]::GetCurrent().User
$everyone = [SecurityIdentifier]::new([WellKnownSidType]::WorldSid, $null)
$acl = if ($directory) { [Directory]::GetAccessControl($path) } else { [File]::GetAccessControl($path) }
if ($env:PAYMOS_TEST_STATE_SHARE -eq '1') {
  $inheritance = if ($directory) { [InheritanceFlags]'ContainerInherit, ObjectInherit' } else { [InheritanceFlags]::None }
  $acl.AddAccessRule([FileSystemAccessRule]::new($everyone, [FileSystemRights]::ReadAndExecute,
    $inheritance, [PropagationFlags]::None, [AccessControlType]::Allow))
  if ($directory) { [Directory]::SetAccessControl($path, $acl) } else { [File]::SetAccessControl($path, $acl) }
}
@{
  protected = $acl.AreAccessRulesProtected
  ownedByCurrentUser = $acl.GetOwner([SecurityIdentifier]).Equals($sid)
  rules = @($acl.GetAccessRules($true, $true, [SecurityIdentifier]) | ForEach-Object {
    @{
      currentUser = $_.IdentityReference.Equals($sid)
      everyone = $_.IdentityReference.Equals($everyone)
      inherited = $_.IsInherited
    }
  })
} | ConvertTo-Json -Compress -Depth 4
`;
  const output = execFileSync(join(windows, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64"),
  ], {
    cwd: windows, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000, windowsHide: true,
    env: {
      SystemRoot: windows, PAYMOS_TEST_STATE_PATH: path,
      PAYMOS_TEST_STATE_DIRECTORY: directory ? "1" : "0", PAYMOS_TEST_STATE_SHARE: share ? "1" : "0",
    },
  });
  return JSON.parse(output) as {
    protected: boolean;
    ownedByCurrentUser: boolean;
    rules: Array<{ currentUser: boolean; everyone: boolean; inherited: boolean }>;
  };
}

function mockMetadataFetch(
  origin: string,
  issuer: string,
  onToken?: (params: URLSearchParams) => Promise<Response> | Response,
) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url === `${origin}/.well-known/oauth-protected-resource/connect/merchant-mcp`) {
      return Response.json({
        resource: `${origin}/connect/merchant-mcp`,
        authorization_servers: [issuer],
      });
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
    if (url === `${origin}/connect/token` && onToken) {
      return onToken(new URLSearchParams(String(init?.body ?? "")));
    }
    return new Response("Not Found", { status: 404 });
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("oauth-session", process.platform === "win32" ? { timeout: 25_000 } : {}, () => {
  it("validates allowed origins and rejects cleartext/userinfo/query/hash/path", () => {
    expect(validateOrigin()).toBe("https://app.paymos.io");
    expect(validateOrigin("https://dev-local.paymos.io")).toBe("https://dev-local.paymos.io");
    expect(validateOrigin("https://dev-local.paymos.io/")).toBe("https://dev-local.paymos.io");
    expect(validateOrigin("http://127.0.0.1:5000")).toBe("http://127.0.0.1:5000");
    expect(validateOrigin("http://localhost:8080/")).toBe("http://localhost:8080");

    for (const bad of [
      "",
      "   ",
      "http://evil.paymos.io",
      "http://127.0.0.1.evil.test",
      "http://[::1]:5000",
      "https://user:pass@app.paymos.io",
      "https://@app.paymos.io",
      "https://app.paymos.io?a=1",
      "https://app.paymos.io#frag",
      "https://app.paymos.io/connect/merchant-mcp",
      "https://app.paymos.io:0",
      "https://app.paymos.io:080",
      "javascript:alert(1)",
      "ftp://app.paymos.io",
      " https://app.paymos.io",
    ]) {
      expect(() => validateOrigin(bad), `expected ${bad} to throw`).toThrow(/^invalid_origin:/);
    }
  });

  it("computes platform defaultTokenPath", () => {
    expect(defaultTokenPath({ APPDATA: "C:\\Users\\alice\\AppData\\Roaming" }, {
      home: "C:\\Users\\alice", platform: "win32",
    })).toBe(join("C:\\Users\\alice\\AppData\\Roaming", "Paymos", "mcp", "merchant-oauth.json"));

    expect(defaultTokenPath({}, { home: "C:\\Users\\alice", platform: "win32" }))
      .toBe(join("C:\\Users\\alice", "AppData", "Roaming", "Paymos", "mcp", "merchant-oauth.json"));

    expect(defaultTokenPath({ XDG_CONFIG_HOME: "/xdg" }, { home: "/home/alice", platform: "linux" }))
      .toBe(join("/xdg", "paymos", "mcp", "merchant-oauth.json"));

    expect(defaultTokenPath({}, { home: "/home/alice", platform: "darwin" }))
      .toBe(join("/home/alice", ".config", "paymos", "mcp", "merchant-oauth.json"));
  });

  it("atomically replaces token files with OS protection and preserves other origins", () => {
    const root = makeTempRoot();
    const tokenPath = join(root, "Paymos", "mcp", "merchant-oauth.json");

    const v1: TokenStore = {
      version: 1,
      origins: {
        "https://app.paymos.io": {
          access_token: "at_v1",
          refresh_token: "rt_v1",
          expires_at: 1_700_000_000_000,
          issuer: "https://app.paymos.io/",
        },
      },
    };
    saveTokenStore(tokenPath, v1);
    expect(readTokenStore(tokenPath)).toEqual(v1);

    const v2: TokenStore = {
      version: 1,
      origins: {
        ...v1.origins,
        "https://dev-local.paymos.io": {
          access_token: "at_local",
          refresh_token: "rt_local",
          expires_at: 1_800_000_000_000,
          issuer: "https://dev-local.paymos.io/",
        },
      },
    };
    saveTokenStore(tokenPath, v2);
    expect(readTokenStore(tokenPath)).toEqual(v2);

    if (process.platform === "win32") {
      const privateAcl = {
        protected: true,
        ownedByCurrentUser: true,
        rules: [{ currentUser: true, everyone: false, inherited: false }],
      };
      expect(windowsAcl(join(root, "Paymos", "mcp"), true)).toEqual(privateAcl);
      expect(windowsAcl(tokenPath, false)).toEqual(privateAcl);

      // Sharing the existing file causes both readTokenStore and replace-file overwrite to fail closed.
      windowsAcl(tokenPath, false, true);
      expect(() => readTokenStore(tokenPath)).toThrow();
      expect(() => saveTokenStore(tokenPath, v1)).toThrow();
    } else {
      expect(statSync(join(root, "Paymos", "mcp")).mode & 0o777).toBe(0o700);
      expect(statSync(tokenPath).mode & 0o777).toBe(0o600);
    }
  });

  it("refuses symlink/reparse token targets", () => {
    const root = makeTempRoot();
    const victim = join(root, "victim.json");
    writeFileSync(victim, '{"keep":true}');
    const dir = join(root, "mcp");
    if (process.platform === "win32") {
      writePrivateFile(join(dir, "seed.json"), "{}", "write-file");
    } else {
      mkdirSync(dir, { mode: 0o700 });
    }
    const tokenPath = join(dir, "merchant-oauth.json");
    symlinkSync(victim, tokenPath, "file");
    expect(() => readTokenStore(tokenPath)).toThrow();
    expect(() => saveTokenStore(tokenPath, { version: 1, origins: {} })).toThrow();
    expect(readFileSync(victim, "utf8")).toBe('{"keep":true}');
  });

  it("completes browser PKCE S256 login, ignores favicon, and verifies state and RFC 9207 iss before token exchange", async () => {
    const root = makeTempRoot();
    const tokenPath = join(root, "mcp", "merchant-oauth.json");
    const origin = "https://dev-local.paymos.io";
    const issuer = `${origin}/`;

    let capturedVerifier = "";
    const fetchMock = mockMetadataFetch(origin, issuer, params => {
      expect(params.get("grant_type")).toBe("authorization_code");
      expect(params.get("client_id")).toBe("paymos-merchant-loopback");
      expect(params.get("code")).toBe("code_valid_1");
      expect(params.get("resource")).toBe(`${origin}/connect/merchant-mcp`);
      expect(params.get("redirect_uri")).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
      capturedVerifier = params.get("code_verifier") ?? "";
      return Response.json({
        access_token: "at_fresh_1",
        refresh_token: "rt_fresh_1",
        token_type: "Bearer",
        expires_in: 300,
      });
    });

    let authRequest!: URL;
    const session = await loginWithBrowser({
      origin,
      tokenFile: tokenPath,
      fetch: fetchMock,
      now: () => 1_700_000_000_000,
      openBrowser: async rawUrl => {
        authRequest = new URL(rawUrl);
        const redirect = new URL(authRequest.searchParams.get("redirect_uri")!);
        // Non-callback browser probes must not abort the handshake.
        const fav = await fetch(new URL("/favicon.ico", redirect));
        expect(fav.status).toBe(404);
        redirect.searchParams.set("code", "code_valid_1");
        redirect.searchParams.set("state", authRequest.searchParams.get("state")!);
        redirect.searchParams.set("iss", issuer);
        const callbackResp = await fetch(redirect);
        expect(callbackResp.status).toBe(200);
      },
    });

    expect(authRequest.searchParams.get("client_id")).toBe("paymos-merchant-loopback");
    expect(authRequest.searchParams.get("scope")).toBe("merchant:mcp offline_access");
    expect(authRequest.searchParams.get("resource")).toBe(`${origin}/connect/merchant-mcp`);
    expect(authRequest.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authRequest.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(capturedVerifier, "ascii").digest("base64url"),
    );
    expect(session).toEqual({
      access_token: "at_fresh_1",
      refresh_token: "rt_fresh_1",
      expires_at: 1_700_000_300_000,
      issuer,
    });
    expect(readTokenStore(tokenPath).origins[origin]).toEqual(session);
  });

  it.each([
    { label: "wrong state", state: "forged-state", iss: "https://app.paymos.io/", expectedError: /^oauth_state_mismatch:/ },
    { label: "missing iss", state: "match", iss: null, expectedError: /^oauth_issuer_mismatch:/ },
    { label: "wrong iss", state: "match", iss: "https://evil.example/", expectedError: /^oauth_issuer_mismatch:/ },
    { label: "access_denied", state: "match", iss: "https://app.paymos.io/", error: "access_denied", expectedError: /^oauth_denied:/ },
  ])("rejects invalid callback ($label) before calling /connect/token", async testCase => {
    const root = makeTempRoot();
    const tokenPath = join(root, "mcp", "merchant-oauth.json");
    const origin = "https://app.paymos.io";
    const tokenSpy = vi.fn(() => Response.json({ access_token: "must_not_issue" }));
    const fetchMock = mockMetadataFetch(origin, `${origin}/`, tokenSpy);

    await expect(loginWithBrowser({
      origin,
      tokenFile: tokenPath,
      fetch: fetchMock,
      openBrowser: async rawUrl => {
        const authUrl = new URL(rawUrl);
        const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
        redirect.searchParams.set("state", testCase.state === "match" ? authUrl.searchParams.get("state")! : testCase.state);
        if (testCase.iss !== null) redirect.searchParams.set("iss", testCase.iss);
        if ("error" in testCase && testCase.error) redirect.searchParams.set("error", testCase.error);
        else redirect.searchParams.set("code", "should_never_be_exchanged");
        const resp = await fetch(redirect);
        expect(resp.status).toBe(400);
      },
    })).rejects.toThrow(testCase.expectedError);

    expect(tokenSpy).not.toHaveBeenCalled();
    expect(existsSync(tokenPath)).toBe(false);
  });

  it("serializes concurrent refresh under ReuseLeeway=Zero and skips refresh when disk already rotated", async () => {
    const root = makeTempRoot();
    const tokenPath = join(root, "mcp", "merchant-oauth.json");
    const origin = "https://app.paymos.io";
    const issuer = `${origin}/`;
    const nowMs = 1_700_000_000_000;

    saveTokenStore(tokenPath, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_expired",
          refresh_token: "rt_one_time",
          expires_at: nowMs - 1_000,
          issuer,
        },
      },
    });

    let refreshCalls = 0;
    const openBrowser = vi.fn();
    const fetchMock = mockMetadataFetch(origin, issuer, async params => {
      expect(params.get("grant_type")).toBe("refresh_token");
      refreshCalls++;
      expect(refreshCalls).toBe(1);
      expect(params.get("refresh_token")).toBe("rt_one_time");
      await new Promise(resolve => setTimeout(resolve, 40));
      return Response.json({
        access_token: "at_rotated_2",
        refresh_token: "rt_rotated_2",
        expires_in: 300,
      });
    });

    // 5 concurrent callers hit expired token simultaneously -> only 1 refresh request runs.
    const tokens = await Promise.all(Array.from({ length: 5 }, () =>
      requireAccessToken({
        origin,
        tokenFile: tokenPath,
        fetch: fetchMock,
        openBrowser,
        now: () => nowMs,
        forceRefresh: true,
        failedAccessToken: "at_expired",
      }),
    ));
    expect(tokens).toEqual(["at_rotated_2", "at_rotated_2", "at_rotated_2", "at_rotated_2", "at_rotated_2"]);
    expect(refreshCalls).toBe(1);
    expect(openBrowser).not.toHaveBeenCalled();

    // Another caller holding stale failedAccessToken="at_expired" after rotation must read disk and NOT re-spend refresh_token.
    const secondWave = await requireAccessToken({
      origin,
      tokenFile: tokenPath,
      fetch: fetchMock,
      openBrowser,
      now: () => nowMs,
      forceRefresh: true,
      failedAccessToken: "at_expired",
    });
    expect(secondWave).toBe("at_rotated_2");
    expect(refreshCalls).toBe(1);
  });

  it("handles stale async lock takeover and silent tryGetAccessToken failure without browser", async () => {
    const root = makeTempRoot();
    const tokenPath = join(root, "mcp", "merchant-oauth.json");
    const origin = "https://app.paymos.io";
    const nowMs = 1_700_000_000_000;

    saveTokenStore(tokenPath, {
      version: 1,
      origins: {
        [origin]: {
          access_token: "at_dead",
          refresh_token: "rt_revoked",
          expires_at: nowMs - 1_000,
          issuer: `${origin}/`,
        },
      },
    });

    // Simulate a crashed process leaving a stale lock > 30s old.
    const lockPath = tokenPath + ".lock";
    writeFileSync(lockPath, "stale", { mode: 0o600 });
    const old = new Date(Date.now() - 45_000);
    utimesSync(lockPath, old, old);
    const lockResult = await withAsyncFileLock(tokenPath, () => "recovered");
    expect(lockResult).toBe("recovered");
    expect(existsSync(lockPath)).toBe(false);

    const openBrowser = vi.fn();
    const fetchMock = mockMetadataFetch(origin, `${origin}/`, () =>
      Response.json({ error: "invalid_grant" }, { status: 400 }),
    );
    const silent = await tryGetAccessToken({
      origin,
      tokenFile: tokenPath,
      fetch: fetchMock,
      openBrowser,
      now: () => nowMs,
    });
    expect(silent).toBeUndefined();
    expect(openBrowser).not.toHaveBeenCalled();
    // Invalidated session is cleaned from store.
    expect(readTokenStore(tokenPath).origins[origin]).toBeUndefined();
  });

  it("single-flights concurrent browser logins when no session exists", async () => {
    const root = makeTempRoot();
    const tokenPath = join(root, "mcp", "merchant-oauth.json");
    const origin = "https://app.paymos.io";
    const issuer = `${origin}/`;
    let browserCalls = 0;

    const fetchMock = mockMetadataFetch(origin, issuer, () =>
      Response.json({ access_token: "at_single_login", refresh_token: "rt_single_login", expires_in: 300 }),
    );

    const results = await Promise.all([1, 2, 3].map(() =>
      requireAccessToken({
        origin,
        tokenFile: tokenPath,
        fetch: fetchMock,
        openBrowser: async rawUrl => {
          browserCalls++;
          await new Promise(resolve => setTimeout(resolve, 25));
          const authUrl = new URL(rawUrl);
          const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
          redirect.searchParams.set("code", "code_single");
          redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
          redirect.searchParams.set("iss", issuer);
          await fetch(redirect);
        },
      }),
    ));
    expect(browserCalls).toBe(1);
    expect(results).toEqual(["at_single_login", "at_single_login", "at_single_login"]);
  });

  it("validates continuation URLs strictly as same-origin ctk_ tickets without query, hash, or userinfo", () => {
    const validTicket43 = "ctk_" + "a".repeat(43);
    const validTicket86 = "ctk_" + "A0_-".repeat(21) + "xy";
    expect(resolveSafeContinuationUrl(`/connect/merchant-mcp/continue/${validTicket43}`, "https://app.paymos.io"))
      .toBe(`https://app.paymos.io/connect/merchant-mcp/continue/${validTicket43}`);
    expect(
      resolveSafeContinuationUrl(
        `https://dev-local.paymos.io/connect/merchant-mcp/continue/${validTicket86}`,
        "https://dev-local.paymos.io/",
      ),
    ).toBe(`https://dev-local.paymos.io/connect/merchant-mcp/continue/${validTicket86}`);
    expect(
      resolveSafeContinuationUrl(
        `https://app.paymos.io:443/connect/merchant-mcp/continue/${validTicket43}`,
        "https://app.paymos.io",
      ),
    ).toBe(`https://app.paymos.io/connect/merchant-mcp/continue/${validTicket43}`);
    expect(
      resolveSafeContinuationUrl(`/connect/merchant-mcp/continue/${validTicket43}`, "http://127.0.0.1:5000"),
    ).toBe(`http://127.0.0.1:5000/connect/merchant-mcp/continue/${validTicket43}`);

    for (const bad of [
      undefined,
      null,
      42,
      {},
      "",
      "   ",
      ` /connect/merchant-mcp/continue/${validTicket43}`,
      `/connect/merchant-mcp/continue/${validTicket43}\n`,
      `\\connect\\merchant-mcp\\continue\\${validTicket43}`,
      `https://evil.test/connect/merchant-mcp/continue/${validTicket43}`,
      `//evil.test/connect/merchant-mcp/continue/${validTicket43}`,
      `http://app.paymos.io/connect/merchant-mcp/continue/${validTicket43}`,
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      `https://user:pass@app.paymos.io/connect/merchant-mcp/continue/${validTicket43}`,
      `https://@app.paymos.io/connect/merchant-mcp/continue/${validTicket43}`,
      `/connect/merchant-mcp/continue/${validTicket43}?x=1`,
      `/connect/merchant-mcp/continue/${validTicket43}#frag`,
      `/connect/merchant-mcp/continue/${validTicket43}?`,
      `/connect/merchant-mcp/continue/${validTicket43}#`,
      "/accounts/1",
      "/connect/merchant-mcp/continue/not_a_ticket_" + "a".repeat(40),
      "/connect/merchant-mcp/continue/ctk_" + "a".repeat(42),
      "/connect/merchant-mcp/continue/ctk_" + "a".repeat(87),
    ]) {
      expect(resolveSafeContinuationUrl(bad, "https://app.paymos.io"), `expected ${String(bad)} to be rejected`)
        .toBeUndefined();
    }
  });

  it("enforces expectedOrigin in openUrlInBrowser and suppresses headless opener failures", async () => {
    const ticketUrl = `https://app.paymos.io/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`;
    const opener = vi.fn();
    await openUrlInBrowser(ticketUrl, "https://app.paymos.io/", opener);
    expect(opener).toHaveBeenCalledExactlyOnceWith(ticketUrl);

    const canonicalOpener = vi.fn();
    await openUrlInBrowser(
      `https://app.paymos.io:443/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`,
      "https://app.paymos.io",
      canonicalOpener,
    );
    expect(canonicalOpener).toHaveBeenCalledExactlyOnceWith(ticketUrl);

    const refusedOpener = vi.fn();
    for (const badUrl of [
      "",
      "   ",
      "file:///etc/passwd",
      `https://evil.test/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`,
      "javascript:alert(1)",
      `https://user@app.paymos.io/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`,
      `https://@app.paymos.io/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`,
      "https://app.paymos.io\\@evil.test/x",
      `https://app.paymos.io/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}\r\n`,
      ` https://app.paymos.io/connect/merchant-mcp/continue/ctk_${"b".repeat(43)}`,
      "not a url",
    ]) {
      await expect(openUrlInBrowser(badUrl, "https://app.paymos.io", refusedOpener), `expected ${badUrl} to throw`)
        .rejects.toThrow(/^invalid_origin:/);
    }
    expect(refusedOpener).not.toHaveBeenCalled();

    await expect(openUrlInBrowser(ticketUrl, "https://app.paymos.io", () => {
      throw new Error("spawn xdg-open ENOENT");
    })).resolves.toBeUndefined();
    await expect(openUrlInBrowser(ticketUrl, "https://app.paymos.io", async () => {
      throw new Error("async headless error");
    })).resolves.toBeUndefined();
  });

  it("supports acquireConnectAccessToken fast-path hit, deferred background callback, single-flight, failure cleanup, and abort cleanup", async () => {
    const origin = "https://dev-local.paymos.io";
    const issuer = `${origin}/`;

    // 1. Fast-path hit when callback arrives before loginFastPathMs expires.
    const rootFast = makeTempRoot();
    const tokenFast = join(rootFast, "mcp", "merchant-oauth.json");
    const fetchFast = mockMetadataFetch(origin, issuer, () =>
      Response.json({ access_token: "at_fast_1", refresh_token: "rt_fast_1", expires_in: 300 }),
    );
    const fastResult = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenFast,
      fetch: fetchFast,
      loginFastPathMs: 500,
      openBrowser: async rawUrl => {
        const authUrl = new URL(rawUrl);
        const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
        redirect.searchParams.set("code", "code_fast");
        redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
        redirect.searchParams.set("iss", issuer);
        await fetch(redirect);
      },
    });
    expect(fastResult).toEqual({ status: "ready", accessToken: "at_fast_1" });

    // 2. Deferred background callback + single-flight across concurrent callers + loginFastPathMs <= 0 immediate return.
    const rootDeferred = makeTempRoot();
    const tokenDeferred = join(rootDeferred, "mcp", "merchant-oauth.json");
    const fetchDeferred = mockMetadataFetch(origin, issuer, () =>
      Response.json({ access_token: "at_deferred_2", refresh_token: "rt_deferred_2", expires_in: 300 }),
    );
    const openedUrls: string[] = [];
    const deferredController = new AbortController();

    const [r1, r2] = await Promise.all([
      acquireConnectAccessToken({
        origin,
        tokenFile: tokenDeferred,
        fetch: fetchDeferred,
        signal: deferredController.signal,
        loginFastPathMs: 25,
        openBrowser: rawUrl => { openedUrls.push(rawUrl); },
      }),
      acquireConnectAccessToken({
        origin,
        tokenFile: tokenDeferred,
        fetch: fetchDeferred,
        signal: deferredController.signal,
        loginFastPathMs: 0,
        openBrowser: rawUrl => { openedUrls.push(rawUrl); },
      }),
    ]);

    expect(openedUrls).toHaveLength(1);
    expect(r1).toEqual({ status: "login_required", authorizeUrl: openedUrls[0]! });
    expect(r2).toEqual({ status: "login_required", authorizeUrl: openedUrls[0]! });

    // Simulate user completing sign-in in a second browser on the loopback callback.
    const authUrl = new URL(openedUrls[0]!);
    const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
    redirect.searchParams.set("code", "code_second_browser");
    redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
    redirect.searchParams.set("iss", issuer);
    const cbResp = await fetch(redirect);
    expect(cbResp.status).toBe(200);

    // Wait briefly for background token exchange & store write to complete.
    let nextResult = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenDeferred,
      fetch: fetchDeferred,
      loginFastPathMs: 250,
      openBrowser: rawUrl => { openedUrls.push(rawUrl); },
    });
    expect(nextResult).toEqual({ status: "ready", accessToken: "at_deferred_2" });
    expect(openedUrls).toHaveLength(1);

    // 3. Background denial clears pending slot without unhandledRejection, allowing a clean retry.
    const rootFail = makeTempRoot();
    const tokenFail = join(rootFail, "mcp", "merchant-oauth.json");
    const failOpens: string[] = [];
    const failFirst = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenFail,
      fetch: fetchDeferred,
      loginFastPathMs: 15,
      openBrowser: rawUrl => { failOpens.push(rawUrl); },
    });
    expect(failFirst.status).toBe("login_required");
    const failAuth = new URL(failOpens[0]!);
    const failRedirect = new URL(failAuth.searchParams.get("redirect_uri")!);
    failRedirect.searchParams.set("state", failAuth.searchParams.get("state")!);
    failRedirect.searchParams.set("iss", issuer);
    failRedirect.searchParams.set("error", "access_denied");
    expect((await fetch(failRedirect)).status).toBe(400);
    await new Promise(resolve => setTimeout(resolve, 25));

    const retryAfterFail = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenFail,
      fetch: fetchDeferred,
      loginFastPathMs: 500,
      openBrowser: async rawUrl => {
        failOpens.push(rawUrl);
        const u = new URL(rawUrl);
        const rd = new URL(u.searchParams.get("redirect_uri")!);
        rd.searchParams.set("code", "code_after_fail");
        rd.searchParams.set("state", u.searchParams.get("state")!);
        rd.searchParams.set("iss", issuer);
        await fetch(rd);
      },
    });
    expect(failOpens).toHaveLength(2);
    expect(retryAfterFail).toEqual({ status: "ready", accessToken: "at_deferred_2" });

    // 4. Aborting signal closes background loopback server and frees pending slot.
    const rootAbort = makeTempRoot();
    const tokenAbort = join(rootAbort, "mcp", "merchant-oauth.json");
    const abortCtrl = new AbortController();
    const abortOpens: string[] = [];
    const pendingRes = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenAbort,
      fetch: fetchDeferred,
      signal: abortCtrl.signal,
      loginFastPathMs: 15,
      openBrowser: rawUrl => { abortOpens.push(rawUrl); },
    });
    expect(pendingRes.status).toBe("login_required");
    const abortRedirect = new URL(new URL(abortOpens[0]!).searchParams.get("redirect_uri")!);
    abortCtrl.abort();
    await new Promise(resolve => setTimeout(resolve, 25));
    await expect(fetch(abortRedirect)).rejects.toThrow();

    const postAbortRes = await acquireConnectAccessToken({
      origin,
      tokenFile: tokenAbort,
      fetch: fetchDeferred,
      loginFastPathMs: 500,
      openBrowser: async rawUrl => {
        abortOpens.push(rawUrl);
        const u = new URL(rawUrl);
        const rd = new URL(u.searchParams.get("redirect_uri")!);
        rd.searchParams.set("code", "code_post_abort");
        rd.searchParams.set("state", u.searchParams.get("state")!);
        rd.searchParams.set("iss", issuer);
        await fetch(rd);
      },
    });
    expect(abortOpens).toHaveLength(2);
    expect(postAbortRes).toEqual({ status: "ready", accessToken: "at_deferred_2" });
  });
});
