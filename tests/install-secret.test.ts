import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInstallSecret, type DeliveryRuntime } from "../src/install-secret.js";

vi.mock("node:fs", async importOriginal => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync), renameSync: vi.fn(fs.renameSync) };
});

const merchant = "11111111-1111-4111-8111-111111111111";
const operation = "22222222-2222-4222-8222-222222222222";
const endpoint = "https://app.paymos.io/connect/merchant-mcp/tickets/secret/redeem";
const ticket = "otk_" + Buffer.alloc(32, 7).toString("base64url");
const secret = "fixture-private-credential#123";
const envFile = ".env.paymos";
const roots: string[] = [];

function fixture(platform: NodeJS.Platform = process.platform) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-install-")));
  roots.push(root);
  const home = join(root, "profile [fixture]'$");
  const cwd = join(root, "project");
  const base = platform === "win32" ? join(home, "AppData", "Local") : home;
  mkdirSync(cwd);
  mkdirSync(base, { recursive: true, mode: 0o700 });
  let clock = Date.now();
  const stdout: string[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>();
  const runtime: DeliveryRuntime = { home, cwd, platform, now: () => clock, fetch, stdout: text => stdout.push(text) };
  const stateDir = join(base, ".paymos-mcp-delivery");
  const file = join(cwd, envFile);
  return { root, base, cwd, stateDir, file, runtime, fetch, stdout, expire: () => { clock += 300_001; } };
}

type Fixture = ReturnType<typeof fixture>;
type Challenge = { request_id: string; challenge: string };

async function prepare(f: Fixture, target = envFile): Promise<Challenge> {
  await runInstallSecret(["--prepare", "--env-file", target, "--merchant-id", merchant,
    "--environment", "Sandbox", "--operation-id", operation], f.runtime);
  return JSON.parse(f.stdout.at(-1)!) as Challenge;
}

function redeem(f: Fixture, request: Challenge, target = envFile) {
  return runInstallSecret(["--token", ticket, "--request-id", request.request_id, "--env-file", target], f.runtime);
}

function secretResponse(request: Challenge, overrides: Record<string, unknown> = {}): Response {
  return Response.json({
    request_id: request.request_id, merchant_id: merchant, environment: "sandbox", operation_id: operation,
    kind: "payment", suggested_env_key: "PAYMOS_API_KEY",
    fields: { PAYMOS_API_KEY: "fixture-public-key", PAYMOS_API_SECRET: secret },
    ...overrides,
  });
}

type WindowsAcl = {
  protected: boolean;
  ownedByCurrentUser: boolean;
  rules: Array<{ currentUser: boolean; everyone: boolean; inherited: boolean }>;
};

function windowsAcl(path: string, directory: boolean, share = false): WindowsAcl {
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
  return JSON.parse(output) as WindowsAcl;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("paymos install-secret", process.platform === "win32" ? { timeout: 15_000 } : {}, () => {
  it("prints only a public S256 challenge and keeps the verifier in the user profile", async () => {
    const f = fixture();
    const descriptor = await prepare(f);
    expect(Object.keys(descriptor).sort()).toEqual(["challenge", "request_id"]);
    expect(descriptor.request_id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const statePath = join(f.stateDir, descriptor.request_id + ".json");
    const saved = JSON.parse(readFileSync(statePath, "utf8"));
    expect(saved.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(descriptor.challenge).toBe(createHash("sha256").update(saved.verifier, "ascii").digest("base64url"));
    expect(saved).toMatchObject({ origin: "https://app.paymos.io", merchantId: merchant, environment: "sandbox",
      operationId: operation, target: f.file, directory: f.cwd, kind: "install-secret" });
    expect(saved.expiresAt - saved.createdAt).toBe(300_000);
    expect(f.stdout.join("\n")).not.toContain(saved.verifier);
    expect(readdirSync(f.cwd)).toEqual([]);
    expect(f.fetch).not.toHaveBeenCalled();
    if (process.platform !== "win32") {
      expect(statSync(f.stateDir).mode & 0o777).toBe(0o700);
      expect(statSync(statePath).mode & 0o777).toBe(0o600);
    }
  });

  it.skipIf(process.platform !== "win32")("rejects Windows state with inherited shared access", async () => {
    const f = fixture();
    windowsAcl(f.base, true, true);
    mkdirSync(f.stateDir);
    expect(windowsAcl(f.stateDir, true)).toMatchObject({
      protected: false,
      rules: expect.arrayContaining([{ currentUser: false, everyone: true, inherited: true }]),
    });
    await expect(prepare(f)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(readdirSync(f.stateDir)).toEqual([]);
    expect(f.stdout).toEqual([]);
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform !== "win32")("creates private Windows state and refuses a verifier shared later", async () => {
    const f = fixture();
    windowsAcl(f.base, true, true);
    const descriptor = await prepare(f);
    const statePath = join(f.stateDir, descriptor.request_id + ".json");
    const privateAcl = {
      protected: true, ownedByCurrentUser: true,
      rules: [{ currentUser: true, everyone: false, inherited: false }],
    };
    expect(windowsAcl(f.stateDir, true)).toEqual(privateAcl);
    expect(windowsAcl(statePath, false)).toEqual(privateAcl);
    expect(windowsAcl(statePath, false, true)).toMatchObject({
      rules: expect.arrayContaining([{ currentUser: false, everyone: true, inherited: false }]),
    });
    vi.mocked(readFileSync).mockClear();
    await expect(redeem(f, descriptor)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(readFileSync).not.toHaveBeenCalled();
    expect(readdirSync(f.stateDir)).toEqual([descriptor.request_id + ".json"]);
    expect(existsSync(f.file)).toBe(false);
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it("redeems only at the pinned endpoint and replaces allowed keys while keeping unrelated .env content", async () => {
    const f = fixture();
    const descriptor = await prepare(f);
    const statePath = join(f.stateDir, descriptor.request_id + ".json");
    const { verifier } = JSON.parse(readFileSync(statePath, "utf8")) as { verifier: string };
    writeFileSync(f.file, "# keep this\r\nUNRELATED='keep'\r\nexport PAYMOS_API_SECRET='old-value'\r\n");
    f.fetch.mockImplementationOnce(async (url, init) => {
      expect(url).toBe(endpoint);
      expect(init).toMatchObject({ method: "POST", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const headers = new Headers(init?.headers);
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.has("Authorization")).toBe(false);
      expect(headers.has("Cookie")).toBe(false);
      expect(headers.has("Paymos-Delivery-Verifier")).toBe(false);
      expect(JSON.parse(String(init?.body))).toEqual({ ticket, request_id: descriptor.request_id, verifier });
      expect(existsSync(statePath)).toBe(false);
      return secretResponse(descriptor);
    });
    await redeem(f, descriptor);
    const content = readFileSync(f.file, "utf8");
    expect(content).toContain("# keep this\r\nUNRELATED='keep'\r\n");
    expect(content).not.toContain("old-value");
    expect(parseEnv(content)).toEqual({ UNRELATED: "keep", PAYMOS_API_KEY: "fixture-public-key", PAYMOS_API_SECRET: secret });
    expect(f.stdout.at(-1)).toBe('{"status":"installed"}');
    for (const privateValue of [secret, ticket, verifier]) expect(f.stdout.join("\n")).not.toContain(privateValue);
    await expect(redeem(f, descriptor)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["payout", "PAYMOS_PAYOUT_API_KEY", { PAYMOS_PAYOUT_API_KEY: "fixture-key", PAYMOS_PAYOUT_API_SECRET: secret }],
    ["webhook", "PAYMOS_WEBHOOK_SECRET", { PAYMOS_WEBHOOK_SECRET: secret }],
    ["invite", "PAYMOS_INVITE_LINK", { PAYMOS_INVITE_LINK: "https://app.paymos.io/invite/fixture" }],
  ])("accepts the exact %s allowlist", async (kind, suggested_env_key, fields) => {
    const f = fixture();
    const request = await prepare(f);
    f.fetch.mockResolvedValueOnce(secretResponse(request, { kind, suggested_env_key, fields }));
    await redeem(f, request);
    expect(parseEnv(readFileSync(f.file, "utf8"))).toEqual(fields);
  });

  it.each([
    { request_id: "other-request" }, { merchant_id: operation },
    { operation_id: merchant }, { environment: "production" },
  ])("does not publish an unbound response (%j)", async overrides => {
    const f = fixture();
    const request = await prepare(f);
    f.fetch.mockResolvedValueOnce(secretResponse(request, overrides));
    await expect(redeem(f, request)).rejects.toThrow(/^delivery_context_mismatch:/);
    expect(existsSync(f.file)).toBe(false);
    expect(f.stdout).toHaveLength(1);
  });

  it.each([
    { kind: "unrecognized" }, { suggested_env_key: "NODE_OPTIONS" },
    { fields: { PAYMOS_API_KEY: "id", PAYMOS_API_SECRET: secret, NODE_OPTIONS: "fixture" } },
    { fields: { PAYMOS_API_KEY: "id", PAYMOS_API_SECRET: "bad\nEXTRA=1" } },
  ])("rejects a response outside the exact key allowlist", async overrides => {
    const f = fixture();
    const request = await prepare(f);
    f.fetch.mockResolvedValueOnce(secretResponse(request, overrides));
    await expect(redeem(f, request)).rejects.toThrow(/^delivery_invalid_response:/);
    expect(existsSync(f.file)).toBe(false);
  });

  it("validates the local target before the request and leaves a good preparation usable", async () => {
    const f = fixture();
    const request = await prepare(f);
    await expect(redeem(f, request, ".env.other")).rejects.toThrow(/^delivery_context_mismatch:/);
    await expect(redeem(f, request, "../outside.env")).rejects.toThrow(/^delivery_unsafe_path:/);
    expect(f.fetch).not.toHaveBeenCalled();
    f.fetch.mockResolvedValueOnce(secretResponse(request));
    await redeem(f, request);
    expect(existsSync(f.file)).toBe(true);
  });

  it("rejects a linked target and a redirected Windows profile directory", async () => {
    const f = fixture("win32");
    const outside = join(f.root, "outside");
    mkdirSync(outside);
    const link = process.platform === "win32" ? "junction" : "dir";
    symlinkSync(outside, join(f.cwd, "linked"), link);
    await expect(prepare(f, "linked/.env")).rejects.toThrow(/^delivery_unsafe_path:/);
    renameSync(f.base, f.base + ".old");
    symlinkSync(outside, f.base, link);
    await expect(prepare(f)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("does not use a copied ticket or an expired local proof", async () => {
    const f = fixture();
    const forged = { request_id: Buffer.alloc(32, 9).toString("base64url"), challenge: "" };
    await expect(redeem(f, forged)).rejects.toThrow(/^delivery_state_unavailable:/);
    const request = await prepare(f);
    f.expire();
    await expect(redeem(f, request)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(existsSync(join(f.stateDir, request.request_id + ".json"))).toBe(false);
    expect(f.fetch).not.toHaveBeenCalled();
    const fresh = await prepare(f);
    expect(existsSync(join(f.stateDir, fresh.request_id + ".json"))).toBe(true);
  });

  it("allows only one process attempt to claim the same prepared proof", async () => {
    const f = fixture();
    const request = await prepare(f);
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>(done => { resolve = done; });
    f.fetch.mockReturnValueOnce(promise);
    const first = redeem(f, request);
    await expect(redeem(f, request)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(f.fetch).toHaveBeenCalledTimes(1);
    resolve(secretResponse(request));
    await first;
  });

  it("refuses redirects and unavailable tickets without echoing the response or retrying", async () => {
    const f = fixture();
    for (const [status, code] of [[302, "delivery_request_failed"], [404, "delivery_unavailable"]] as const) {
      const request = await prepare(f);
      f.fetch.mockResolvedValueOnce(new Response(secret, { status, headers: { Location: "https://other.example/" + ticket } }));
      const outcome = await redeem(f, request).catch(error => (error as Error).message);
      expect(outcome).toContain(code);
      expect(outcome).not.toContain(ticket);
      expect(outcome).not.toContain(secret);
      expect(existsSync(f.file)).toBe(false);
    }
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite a concurrent .env change or expose a failed atomic write", async () => {
    const f = fixture();
    const original = "# original\nUNRELATED=keep\n";
    writeFileSync(f.file, original);
    const request = await prepare(f);
    f.fetch.mockImplementationOnce(async () => {
      writeFileSync(f.file, original + "# concurrent\n");
      return secretResponse(request);
    });
    await expect(redeem(f, request)).rejects.toThrow(/^delivery_local_io_failed:/);
    expect(readFileSync(f.file, "utf8")).toBe(original + "# concurrent\n");
    const retry = await prepare(f);
    f.fetch.mockResolvedValueOnce(secretResponse(retry));
    vi.mocked(renameSync).mockImplementationOnce(() => { throw new Error(secret); });
    const error = await redeem(f, retry).catch(cause => (cause as Error).message);
    expect(error).toMatch(/^delivery_local_io_failed:/);
    expect(error).not.toContain(secret);
    expect(readdirSync(f.cwd)).toEqual([envFile]);
    expect(readFileSync(f.file, "utf8")).toBe(original + "# concurrent\n");
  });

  it("supports --file without colliding with Node's --env-file flag and rejects mixing both flags", async () => {
    const f = fixture();
    await runInstallSecret(["--prepare", "--file", envFile, "--merchant-id", merchant,
      "--environment", "Sandbox", "--operation-id", operation], f.runtime);
    const descriptor = JSON.parse(f.stdout.at(-1)!) as Challenge;
    expect(descriptor.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);

    await expect(runInstallSecret(["--prepare", "--file", envFile, "--env-file", envFile,
      "--merchant-id", merchant, "--environment", "Sandbox", "--operation-id", operation], f.runtime))
      .rejects.toThrow(/^delivery_arguments:/);

    f.fetch.mockResolvedValueOnce(secretResponse(descriptor));
    await runInstallSecret(["--token", ticket, "--request-id", descriptor.request_id, "--file", envFile], f.runtime);
    expect(parseEnv(readFileSync(f.file, "utf8"))).toEqual({
      PAYMOS_API_KEY: "fixture-public-key",
      PAYMOS_API_SECRET: secret,
    });

    const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const builtCli = resolve(pkgRoot, "dist/index.js");
    if (!existsSync(builtCli)) {
      const build = process.platform === "win32"
        ? spawnSync("cmd.exe", ["/d", "/c", "npm.cmd", "run", "build"], { cwd: pkgRoot, encoding: "utf8" })
        : spawnSync("npm", ["run", "build"], { cwd: pkgRoot, encoding: "utf8" });
      expect(build.status, build.stderr || build.stdout).toBe(0);
    }
    const env = { ...process.env, HOME: f.runtime.home, USERPROFILE: f.runtime.home, LOCALAPPDATA: join(f.runtime.home, "AppData", "Local") };
    const cli = spawnSync(process.execPath, [
      builtCli, "install-secret", "--prepare", "--file", ".env.new",
      "--merchant-id", merchant, "--environment", "sandbox", "--operation-id", operation,
    ], { cwd: f.cwd, env, encoding: "utf8" });
    expect(cli.status).toBe(0);
    expect(cli.stderr).toBe("");
    const parsed = JSON.parse(cli.stdout.trim()) as Challenge;
    expect(parsed.request_id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(parsed.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(existsSync(join(f.cwd, ".env.new"))).toBe(false);
    const realStateBase = process.platform === "win32"
      ? (process.env.LOCALAPPDATA ?? join(userInfo().homedir, "AppData", "Local"))
      : userInfo().homedir;
    rmSync(join(realStateBase, ".paymos-mcp-delivery", parsed.request_id + ".json"), { force: true });
  }, 30_000);
});
