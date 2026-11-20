import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseJson } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildConnectEntry, detectInstalledClients, planConnectTargets,
  publishConnectPlans, resolveClientsForSetup, runAuth,
} from "../src/auth.js";
import { loadCredentials } from "../src/config.js";
import { main } from "../src/index.js";
import { readTokenStore } from "../src/oauth-session.js";
import { defaultConfigPath } from "../src/setup.js";
import { AUTH_COPY, SETUP_COPY } from "../src/setup-copy.js";
import { DestinationBusyError, LOCK_SUFFIX, STALE_LOCK_MS, withDestinationLock } from "../src/setup-lock.js";

vi.mock("../src/config.js", async importOriginal => ({
  ...await importOriginal<typeof import("../src/config.js")>(),
  loadCredentials: vi.fn(),
}));

const roots: string[] = [];
const legacyRemoteUrl = "https://app.paymos.io/connect/merchant-mcp";
const legacyCodexToml = '# keep header\nmodel = "gpt-5"\n\n[mcp_servers.other]\ncommand = "other"\n\n'
  + '[mcp_servers.paymos]\nurl = "' + legacyRemoteUrl + '"\nscopes = ["merchant:mcp", "offline_access"]\n\n'
  + '[mcp_servers.paymos.oauth]\nclient_id = "paymos-merchant-codex"\ncallback_port = 33419\n'
  + 'callback_url = "http://127.0.0.1:33419/callback"\n';
const legacyClaudeEntry = {
  type: "http",
  url: legacyRemoteUrl,
  oauth: { clientId: "paymos-merchant-claude-code", callbackPort: 33420, scopes: "merchant:mcp offline_access" },
};
const sandboxEntry = {
  command: "npx",
  args: ["-y", "@paymos/mcp"],
  env: { PAYMOS_CREDENTIALS_FILE: "sandbox.json" },
};

function save(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { mode: 0o700 });
}

function fixture(platform: NodeJS.Platform = "linux") {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-auth-")));
  roots.push(root);
  const home = join(root, "home");
  const cwd = join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(cwd, { recursive: true });
  const env = {
    APPDATA: join(root, "Roaming"),
    XDG_CONFIG_HOME: join(root, "xdg-config"),
  };
  const tokenFile = join(root, "tokens", "merchant-oauth.json");
  const logs: string[] = [];
  const io = {
    interactive: false,
    ask: vi.fn<() => Promise<string>>(),
    log: (text: string) => logs.push(text),
  };
  return { root, home, cwd, env, tokenFile, logs, io, context: { home, cwd, platform } };
}

function mockOAuthHooks(origin = "https://app.paymos.io") {
  const issuer = `${origin}/`;
  let loginCount = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
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
    if (url === `${origin}/connect/token`) {
      const params = new URLSearchParams(String(init?.body ?? ""));
      expect(params.get("grant_type")).toBe("authorization_code");
      return Response.json({
        access_token: "at_auth_browser_1",
        refresh_token: "rt_auth_browser_1",
        expires_in: 300,
      });
    }
    return new Response("Not Found", { status: 404 });
  });

  const openBrowser = vi.fn(async (rawUrl: string) => {
    loginCount++;
    const authUrl = new URL(rawUrl);
    const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
    redirect.searchParams.set("code", "code_auth_1");
    redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
    redirect.searchParams.set("iss", issuer);
    await fetch(redirect);
  });

  return {
    hooks: { fetch: fetchMock, openBrowser },
    getLoginCount: () => loginCount,
    openBrowser,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("paymos unified auth", process.platform === "win32" ? { timeout: 25_000 } : {}, () => {
  it("contains zero references to child_process or external mcp login wrappers in auth.ts", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const authSource = readFileSync(resolve(here, "..", "src", "auth.ts"), "utf8");
    expect(authSource).not.toContain("child_process");
    expect(authSource).not.toContain("resolveLaunch");
    expect(authSource).not.toContain("nativeLogin");
    expect(authSource).not.toContain("--bridge");
    expect(authSource).not.toContain("mcp login");
  });

  it.each([
    "codex",
    "claude-code",
    "claude-desktop",
    "antigravity",
    "kimi",
    "zcode",
    "glm",
    "cursor",
    "windsurf",
    "opencode",
    "vscode",
    "generic",
  ] as const)("writes exact connect envelope for %s (--no-login) on Windows and POSIX", async client => {
    for (const platform of ["win32", "linux"] as const) {
      const f = fixture(platform);
      const explicitConfig = client === "generic" || (client === "claude-desktop" && platform === "linux")
        ? join(f.root, "explicit", "mcp.json")
        : undefined;
      const args = [
        "--client", client,
        "--no-login",
        ...(explicitConfig ? ["--config", explicitConfig] : []),
      ];

      await expect(runAuth(args, f.env, f.io, f.context)).resolves.toBe(0);

      const targetPath = explicitConfig ?? defaultConfigPath(client, f.env, f.context);
      const raw = readFileSync(targetPath, "utf8");
      const expectedEntry = buildConnectEntry(client, "https://app.paymos.io", platform);

      if (platform === "win32") {
        const expectedCmd = client === "opencode"
          ? { type: "local", command: ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"], enabled: true }
          : { command: "cmd", args: ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"] };
        expect(expectedEntry).toMatchObject(expectedCmd);
      } else {
        const expectedCmd = client === "opencode"
          ? { type: "local", command: ["npx", "-y", "@paymos/mcp", "connect"], enabled: true }
          : { command: "npx", args: ["-y", "@paymos/mcp", "connect"] };
        expect(expectedEntry).toMatchObject(expectedCmd);
      }

      if (client === "codex") {
        expect(parseToml(raw)).toEqual({ mcp_servers: { paymos: expectedEntry } });
      } else if (client === "opencode") {
        expect(parseJson(raw)).toEqual({ mcp: { paymos: expectedEntry } });
      } else if (client === "vscode") {
        expect(parseJson(raw)).toEqual({ servers: { paymos: expectedEntry } });
      } else if (client === "zcode" || client === "glm") {
        expect(parseJson(raw)).toEqual({ mcp: { servers: { paymos: expectedEntry } } });
      } else {
        expect(parseJson(raw)).toEqual({ mcpServers: { paymos: expectedEntry } });
      }

      // Idempotent repeat.
      await expect(runAuth(args, f.env, f.io, f.context)).resolves.toBe(0);
      expect(readFileSync(targetPath, "utf8")).toBe(raw);
    }
  });

  it("includes --origin in connect args only for non-default origins and executes single browser login", async () => {
    const f = fixture("win32");
    const origin = "https://dev-local.paymos.io";
    const oauth = mockOAuthHooks(origin);
    const seenAuthUrls: string[] = [];

    await expect(runAuth(
      ["--client", "codex", "--origin", origin, "--token-file", f.tokenFile],
      f.env,
      f.io,
      f.context,
      { ...oauth.hooks, onAuthUrl: url => seenAuthUrls.push(url) },
    )).resolves.toBe(0);

    expect(oauth.getLoginCount()).toBe(1);
    expect(seenAuthUrls).toHaveLength(1);
    expect(seenAuthUrls[0]).toMatch(/^https:\/\/dev-local\.paymos\.io\/connect\/authorize\?/);
    const openIdx = f.logs.indexOf(AUTH_COPY.openingBrowser(seenAuthUrls[0]!));
    const signedInIdx = f.logs.indexOf(AUTH_COPY.signedIn(origin));
    expect(openIdx).toBeGreaterThanOrEqual(0);
    expect(signedInIdx).toBeGreaterThan(openIdx);
    expect(f.logs.at(-1)).toBe(AUTH_COPY.restart);
    expect(readTokenStore(f.tokenFile).origins[origin]?.access_token).toBe("at_auth_browser_1");
    expect(parseToml(readFileSync(defaultConfigPath("codex", f.env, f.context), "utf8"))).toEqual({
      mcp_servers: {
        paymos: {
          command: "cmd",
          args: ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect", "--origin", origin],
        },
      },
    });
  });

  it("auto-detects installed clients (skipping claude-desktop on Linux and requiring .vscode for vscode) with ONE browser login", async () => {
    const f = fixture("linux");
    save(join(f.home, ".gemini", "config", "mcp_config.json"), '// antigravity\n{"mcpServers":{"other":{"command":"a"}}}\n');
    save(join(f.home, ".zcode", "cli", "config.json"), '{"mcp":{"servers":{}}}\n');
    save(join(f.home, ".codex", "config.toml"), 'model = "o3"\n');
    mkdirSync(join(f.home, ".claude"), { recursive: true });
    // Even if Claude Desktop dir existed on Linux, Linux must safely skip claude-desktop.
    mkdirSync(join(f.env.APPDATA, "Claude"), { recursive: true });
    mkdirSync(join(f.env.XDG_CONFIG_HOME, "opencode"), { recursive: true });

    // Without .vscode directory, vscode is not detected.
    expect(detectInstalledClients(f.context, f.env)).toEqual([
      "antigravity", "claude-code", "codex", "zcode", "opencode",
    ]);

    // Adding .vscode directory includes vscode.
    mkdirSync(join(f.cwd, ".vscode"));
    expect(detectInstalledClients(f.context, f.env)).toEqual([
      "antigravity", "claude-code", "codex", "zcode", "opencode", "vscode",
    ]);

    const oauth = mockOAuthHooks();
    await expect(runAuth(["--token-file", f.tokenFile], f.env, f.io, f.context, oauth.hooks)).resolves.toBe(0);
    expect(oauth.getLoginCount()).toBe(1);

    const antigravityRaw = readFileSync(join(f.home, ".gemini", "config", "mcp_config.json"), "utf8");
    expect(antigravityRaw).toContain("// antigravity");
    expect(parseJson(antigravityRaw).mcpServers.other).toEqual({ command: "a" });
    expect(parseJson(antigravityRaw).mcpServers.paymos).toEqual({
      command: "npx", args: ["-y", "@paymos/mcp", "connect"],
    });
    expect(parseJson(readFileSync(join(f.home, ".zcode", "cli", "config.json"), "utf8")).mcp.servers.paymos).toEqual({
      command: "npx", args: ["-y", "@paymos/mcp", "connect"],
    });
    expect(parseToml(readFileSync(join(f.home, ".codex", "config.toml"), "utf8"))).toMatchObject({
      mcp_servers: { paymos: { command: "npx", args: ["-y", "@paymos/mcp", "connect"] } },
    });
    expect(parseJson(readFileSync(join(f.home, ".claude.json"), "utf8")).mcpServers.paymos).toEqual({
      command: "npx", args: ["-y", "@paymos/mcp", "connect"],
    });
    expect(parseJson(readFileSync(join(f.env.XDG_CONFIG_HOME, "opencode", "opencode.json"), "utf8")).mcp.paymos).toEqual({
      type: "local", command: ["npx", "-y", "@paymos/mcp", "connect"], enabled: true,
    });
    expect(parseJson(readFileSync(join(f.cwd, ".vscode", "mcp.json"), "utf8")).servers.paymos).toEqual({
      type: "stdio", command: "npx", args: ["-y", "@paymos/mcp", "connect"],
    });
  });

  it("handles clean-PC zero detected clients in non-TTY and interactive TTY mode", async () => {
    const f = fixture("linux");
    await expect(runAuth([], f.env, f.io, f.context)).rejects.toThrow(/^client_required:/);

    f.io.ask.mockResolvedValue("glm");
    await expect(runAuth(["--no-login"], f.env, { ...f.io, interactive: true }, f.context)).resolves.toBe(0);
    expect(f.io.ask).toHaveBeenCalledOnce();
    expect(parseJson(readFileSync(join(f.home, ".zcode", "cli", "config.json"), "utf8")).mcp.servers.paymos).toEqual({
      command: "npx", args: ["-y", "@paymos/mcp", "connect"],
    });
  });

  it("upgrades legacy /connect/merchant-mcp HTTP entries in-place for Codex TOML and Claude JSON", async () => {
    const f = fixture("linux");
    const codexPath = defaultConfigPath("codex", f.env, f.context);
    const claudePath = defaultConfigPath("claude-code", f.env, f.context);
    save(codexPath, legacyCodexToml);
    save(claudePath, '{\n// keep claude comment\n"mcpServers":{"paymos":' + JSON.stringify(legacyClaudeEntry) + '}}\n');

    await expect(runAuth(["--client", "codex", "--no-login"], f.env, f.io, f.context)).resolves.toBe(0);
    const upgradedCodex = readFileSync(codexPath, "utf8");
    expect(upgradedCodex).toContain("# keep header");
    expect(parseToml(upgradedCodex)).toEqual({
      model: "gpt-5",
      mcp_servers: {
        other: { command: "other" },
        paymos: { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
      },
    });

    await expect(runAuth(["--client", "claude-code", "--no-login"], f.env, f.io, f.context)).resolves.toBe(0);
    const upgradedClaude = readFileSync(claudePath, "utf8");
    expect(upgradedClaude).toContain("// keep claude comment");
    expect(parseJson(upgradedClaude)).toEqual({
      mcpServers: {
        paymos: { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
      },
    });
  });

  it("coexists with Sandbox under paymos-merchant and upgrades legacy paymos-merchant HTTP entry", async () => {
    const f = fixture("linux");
    const cursorPath = defaultConfigPath("cursor", f.env, f.context);
    const initial = '{\n// keep cursor\n"mcpServers":{"paymos":' + JSON.stringify(sandboxEntry) + '}}\n';
    save(cursorPath, initial);

    await expect(runAuth(["--client", "cursor", "--no-login"], f.env, f.io, f.context)).resolves.toBe(0);
    const written = readFileSync(cursorPath, "utf8");
    expect(written).toContain("// keep cursor");
    expect(parseJson(written)).toEqual({
      mcpServers: {
        paymos: sandboxEntry,
        "paymos-merchant": { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
      },
    });

    // Legacy HTTP under paymos-merchant alongside Sandbox also upgrades cleanly.
    save(cursorPath, JSON.stringify({ mcpServers: { paymos: sandboxEntry, "paymos-merchant": legacyClaudeEntry } }));
    await expect(runAuth(["--client", "cursor", "--no-login"], f.env, f.io, f.context)).resolves.toBe(0);
    expect(parseJson(readFileSync(cursorPath, "utf8"))).toEqual({
      mcpServers: {
        paymos: sandboxEntry,
        "paymos-merchant": { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
      },
    });
  });

  it("rejects foreign entries, unsafe origins, and cancelled browser login without modifying configs", async () => {
    const f = fixture("linux");
    const cursorPath = defaultConfigPath("cursor", f.env, f.context);
    const foreign = JSON.stringify({ mcpServers: { paymos: { type: "http", url: "https://foreign.example/mcp" } } });
    save(cursorPath, foreign);
    const oauth = mockOAuthHooks();

    await expect(runAuth(["--client", "cursor"], f.env, f.io, f.context, oauth.hooks))
      .rejects.toThrow(/^configuration_conflict:/);
    expect(readFileSync(cursorPath, "utf8")).toBe(foreign);
    expect(oauth.getLoginCount()).toBe(0);

    await expect(runAuth(["--client", "codex", "--origin", "http://evil.paymos.io"], f.env, f.io, f.context))
      .rejects.toThrow(/^invalid_origin:/);
    expect(existsSync(defaultConfigPath("codex", f.env, f.context))).toBe(false);

    // Cancelled browser consent leaves config untouched and returns 130.
    const cancelPath = defaultConfigPath("antigravity", f.env, f.context);
    save(cancelPath, '{"mcpServers":{}}');
    const code = await runAuth(["--client", "antigravity", "--token-file", f.tokenFile], f.env, f.io, f.context, {
      ...oauth.hooks,
      openBrowser: async rawUrl => {
        const authUrl = new URL(rawUrl);
        const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
        redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
        redirect.searchParams.set("iss", "https://app.paymos.io/");
        redirect.searchParams.set("error", "access_denied");
        await fetch(redirect);
      },
    });
    expect(code).toBe(130);
    expect(readFileSync(cancelPath, "utf8")).toBe('{"mcpServers":{}}');

    // Dry-run does not call openBrowser or write any files.
    const dryHooks = mockOAuthHooks();
    const dryPath = defaultConfigPath("kimi", f.env, f.context);
    await expect(runAuth(["--client", "kimi", "--dry-run"], f.env, f.io, f.context, dryHooks.hooks)).resolves.toBe(0);
    expect(dryHooks.getLoginCount()).toBe(0);
    expect(existsSync(dryPath)).toBe(false);
    expect(f.logs.at(-1)).toContain("No files were changed");
  });

  it("keeps destination lock protection and routes help commands cleanly in index.ts", async () => {
    const f = fixture("linux");
    const codexPath = defaultConfigPath("codex", f.env, f.context);
    save(codexPath + LOCK_SUFFIX, "");
    await expect(runAuth(["--client", "codex", "--no-login"], f.env, f.io, f.context))
      .rejects.toThrow(/^configuration_conflict:/);
    expect(existsSync(codexPath)).toBe(false);

    const staleDest = join(f.root, "stale-dest.toml");
    const lock = staleDest + LOCK_SUFFIX;
    save(lock, "stale");
    const publish = vi.fn();
    expect(() => withDestinationLock(staleDest, publish, () => {
      renameSync(lock, lock + ".old");
      save(lock, "new holder");
      return Date.now() + STALE_LOCK_MS + 1_000;
    })).toThrow(DestinationBusyError);
    expect(publish).not.toHaveBeenCalled();

    const lockSymlink = join(f.root, "sym" + LOCK_SUFFIX);
    symlinkSync(f.cwd, lockSymlink, process.platform === "win32" ? "junction" : "dir");
    expect(() => withDestinationLock(join(f.root, "sym"), vi.fn(), () => Date.now() + STALE_LOCK_MS + 1_000))
      .toThrow(DestinationBusyError);
    expect(lstatSync(lockSymlink).isSymbolicLink()).toBe(true);

    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(main({}, ["auth", "--help"])).resolves.toBeUndefined();
    expect(output).toHaveBeenCalledWith(expect.stringContaining("npx -y @paymos/mcp auth"));
    await expect(main({}, ["setup", "--help"])).resolves.toBeUndefined();
    expect(output).toHaveBeenCalledWith(expect.stringContaining("npx -y @paymos/mcp setup"));
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await expect(main({}, ["connect", "--help"])).resolves.toBeUndefined();
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("npx -y @paymos/mcp connect"));
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it("exposes shared connect planning/publishing helpers and executes main(['setup', ...]) parity", async () => {
    const f = fixture("linux");
    const clients = await resolveClientsForSetup(
      { fallbackClients: ["claude-code", "codex"] },
      f.env,
      f.io,
      f.context,
    );
    expect(clients).toEqual(["claude-code", "codex"]);

    const plans = planConnectTargets(clients!, undefined, "https://app.paymos.io", f.env, f.context);
    expect(plans).toHaveLength(2);

    const first = publishConnectPlans(plans, f.io, f.context);
    expect(first).toEqual({ wroteAny: true });
    expect(f.logs).not.toContain(AUTH_COPY.restart);
    expect(f.logs).not.toContain(SETUP_COPY.restart);

    const secondPlans = planConnectTargets(clients!, undefined, "https://app.paymos.io", f.env, f.context);
    const second = publishConnectPlans(secondPlans, f.io, f.context);
    expect(second).toEqual({ wroteAny: false });

    // main(env, ["setup", ...]) runs universal zero-key setup without touching loadCredentials.
    const explicitConfig = join(f.root, "main-setup", "mcp.json");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const prevExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await expect(
        main(f.env, ["setup", "--client", "generic", "--config", explicitConfig, "--no-login"]),
      ).resolves.toBeUndefined();
      expect(process.exitCode).toBeUndefined();
      expect(parseJson(readFileSync(explicitConfig, "utf8")).mcpServers.paymos).toEqual(
        buildConnectEntry("generic", "https://app.paymos.io", process.platform),
      );
      expect(logSpy.mock.calls.flat().join("\n")).toContain(SETUP_COPY.referenceReady);
      expect(loadCredentials).not.toHaveBeenCalled();
    } finally {
      process.exitCode = prevExitCode;
    }
  });
});
