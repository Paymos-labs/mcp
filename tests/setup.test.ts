import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync,
  statSync, symlinkSync, utimesSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseJson } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConnectEntry } from "../src/auth.js";
import { readTokenStore } from "../src/oauth-session.js";
import { defaultConfigPath, planClientConfig, runSetup, type SetupIO } from "../src/setup.js";
import { AUTH_COPY, SETUP_COPY } from "../src/setup-copy.js";
import { readCredentialFile } from "../src/credential-file.js";
import { LOCK_SUFFIX } from "../src/setup-lock.js";

vi.mock("node:fs", async importOriginal => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return { ...fs, renameSync: vi.fn(fs.renameSync) };
});

const keys = { apiKeyId: "pk_test_fixture", apiSecret: "sk_test_DO_NOT_LOG", webhookSecret: "whsec_DO_NOT_LOG" };
const env = { PAYMOS_API_KEY_ID: keys.apiKeyId, PAYMOS_API_SECRET: keys.apiSecret, PAYMOS_WEBHOOK_SECRET: keys.webhookSecret };
function fixture(platform: NodeJS.Platform = "linux") {
  const home = mkdtempSync(join(tmpdir(), "paymos-setup-"));
  const context = { home, cwd: home, platform };
  const logs: string[] = [];
  const io: SetupIO = { interactive: false, ask: async () => { throw new Error("unexpected prompt"); }, log: s => logs.push(s) };
  const credentials = join(home, ".config", "paymos", "mcp", "credentials.json");
  return { home, context, logs, io, credentials };
}
function save(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { mode: 0o600 });
}

describe("client schemas", () => {
  it.each(["claude-code", "claude-desktop", "antigravity", "kimi", "cursor", "windsurf", "generic"] as const)("adds %s without changing foreign settings/comments", client => {
    const original = '{\n// keep this\n"model":"custom-glm","mcpServers":{"other":{"command":"other"}},\n}\n';
    const text = planClientConfig(client, original, "/private/keys.json", "linux");
    expect(text).toContain("// keep this");
    expect(parseJson(text)).toEqual({ model: "custom-glm", mcpServers: {
      other: { command: "other" }, paymos: { command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "/private/keys.json" } },
    } });
    expect(planClientConfig(client, text, "/private/keys.json", "linux")).toBe(text);
  });

  it("appends a TOML table without reformatting existing Codex settings", () => {
    const original = '# keep\r\nmodel = "custom-kimi"\r\n[mcp_servers.other]\r\ncommand = "other"\r\n';
    const text = planClientConfig("codex", original, "/private/with spaces/keys.json", "linux");
    expect(text.startsWith(original)).toBe(true);
    expect(parseToml(text)).toEqual({ model: "custom-kimi", mcp_servers: {
      other: { command: "other" }, paymos: { command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "/private/with spaces/keys.json" } },
    } });
    expect(planClientConfig("codex", text, "/private/with spaces/keys.json", "linux")).toBe(text);
  });

  it("uses OpenCode command-array/environment and retains JSONC", () => {
    const text = planClientConfig("opencode", '{// keep\n"model":"glm/custom","mcp":{}}', "/keys.json", "win32");
    expect(parseJson(text)).toEqual({ model: "glm/custom", mcp: { paymos: {
      type: "local", command: ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp"], environment: { PAYMOS_CREDENTIALS_FILE: "/keys.json" }, enabled: true,
    } } });
    expect(text).toContain("// keep");
  });

  it("uses VS Code servers/type rather than mcpServers", () => {
    expect(parseJson(planClientConfig("vscode", null, "/keys.json", "linux"))).toEqual({ servers: { paymos: {
      type: "stdio", command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "/keys.json" },
    } } });
  });

  it("uses nested mcp.servers for zcode and glm alias while retaining JSONC comments", () => {
    const original = '{// keep zcode\n"mcp":{"servers":{"other":{"command":"other"}}}}\n';
    for (const alias of ["zcode", "glm"] as const) {
      const text = planClientConfig(alias, original, "/keys.json", "linux");
      expect(text).toContain("// keep zcode");
      expect(parseJson(text)).toEqual({
        mcp: {
          servers: {
            other: { command: "other" },
            paymos: { command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "/keys.json" } },
          },
        },
      });
      expect(planClientConfig(alias, text, "/keys.json", "linux")).toBe(text);
    }
  });

  it.each(['{"mcpServers":null}', '{"mcpServers":[]}', '{"mcpServers":{},"mcpServers":{}}',
    '{"outer":{"x":1,"x":2}}', '{"sk_test_DO_NOT_LOG":'])
  ("rejects invalid/duplicate JSON config (%#)", value => {
    expect(() => planClientConfig("cursor", value, "/keys.json", "linux")).toThrow("configuration");
  });

  it("rejects conflicting entries and incompatible TOML without changing bytes", () => {
    expect(() => planClientConfig("cursor", '{"mcpServers":{"paymos":{"command":"foreign"}}}', "/keys", "linux")).toThrow("differs");
    expect(() => planClientConfig("codex", '[mcp_servers.paymos]\ncommand="foreign"', "/keys", "linux")).toThrow("differs");
    expect(() => planClientConfig("codex", 'mcp_servers = {}', "/keys", "linux")).toThrow("configuration");
    expect(() => planClientConfig("codex", 'sk_test_DO_NOT_LOG = "', "/keys", "linux")).toThrow("configuration");
  });
});

describe("setup writes", () => {
  it.each(["codex", "claude-code", "antigravity", "kimi", "zcode", "cursor", "windsurf", "opencode", "vscode"] as const)("configures %s with a usable private file and no inline secrets", async client => {
    const f = fixture();
    await runSetup(["--client", client], env, f.io, f.context);
    const path = defaultConfigPath(client, {}, f.context);
    const config = readFileSync(path, "utf8");
    expect(config).toContain("PAYMOS_CREDENTIALS_FILE");
    expect(config).not.toContain(keys.apiSecret);
    expect(config).not.toContain(keys.webhookSecret);
    expect(readCredentialFile(f.credentials)).toEqual(keys);
    expect(f.logs.join("\n")).not.toContain(keys.apiSecret);
    const before = readFileSync(f.credentials, "utf8");
    await runSetup(["--client", client], env, f.io, f.context);
    expect(readFileSync(path, "utf8")).toBe(config);
    expect(readFileSync(f.credentials, "utf8")).toBe(before);
    expect(f.logs.at(-1)).toContain("already matches");
    if (process.platform !== "win32") expect(statSync(f.credentials).mode & 0o077).toBe(0);
  });

  it("honours explicit paths and home overrides without touching real user configs", async () => {
    const f = fixture();
    const config = join(f.home, "chosen", "client.json");
    const credentials = join(f.home, "private", "keys.json");
    await runSetup(["--client=generic", "--config", config, "--credentials-file", credentials], env, f.io, f.context);
    expect(readCredentialFile(credentials)).toEqual(keys);
    expect(parseJson(readFileSync(config, "utf8")).mcpServers.paymos.env.PAYMOS_CREDENTIALS_FILE).toBe(credentials);
    expect(defaultConfigPath("codex", { CODEX_HOME: "/codex-custom" }, f.context)).toBe(join("/codex-custom", "config.toml"));
    expect(defaultConfigPath("kimi", { KIMI_CODE_HOME: "/kimi-custom" }, f.context)).toBe(join("/kimi-custom", "mcp.json"));
    expect(defaultConfigPath("opencode", { OPENCODE_CONFIG: "/chosen.jsonc" }, f.context)).toBe("/chosen.jsonc");
    expect(defaultConfigPath("claude-desktop", { APPDATA: "/appdata" }, { ...f.context, platform: "win32" })).toBe(join("/appdata", "Claude", "claude_desktop_config.json"));
    expect(defaultConfigPath("antigravity", {}, f.context)).toBe(join(f.home, ".gemini", "config", "mcp_config.json"));
    expect(defaultConfigPath("zcode", {}, f.context)).toBe(join(f.home, ".zcode", "cli", "config.json"));
    expect(defaultConfigPath("glm", {}, f.context)).toBe(join(f.home, ".zcode", "cli", "config.json"));

    const glmHome = fixture();
    await runSetup(["--client", "glm"], env, glmHome.io, glmHome.context);
    expect(parseJson(readFileSync(join(glmHome.home, ".zcode", "cli", "config.json"), "utf8")).mcp.servers.paymos.env.PAYMOS_CREDENTIALS_FILE)
      .toBe(glmHome.credentials);
  });

  it("reuses a saved private pair when adding another client", async () => {
    const f = fixture();
    save(f.credentials, JSON.stringify(keys));
    await runSetup(["--client", "cursor", "--sandbox"], {}, f.io, f.context);
    expect(readFileSync(defaultConfigPath("cursor", {}, f.context), "utf8")).toContain("PAYMOS_CREDENTIALS_FILE");
  });

  it("dry-run creates no directories/files and prints no secrets", async () => {
    const f = fixture();
    await runSetup(["--client", "codex", "--dry-run"], env, f.io, f.context);
    expect(existsSync(join(f.home, ".codex"))).toBe(false);
    expect(existsSync(join(f.home, ".config"))).toBe(false);
    expect(f.logs.join("\n")).not.toContain(keys.apiSecret);
    expect(f.logs.at(-1)).toContain("No files were changed");
  });

  it.each([
    { PAYMOS_API_KEY_ID: "pk_live_denied", PAYMOS_API_SECRET: "sk_live_NEVER_PRINT" },
    { PAYMOS_API_KEY_ID: "rk_test_denied", PAYMOS_API_SECRET: "sk_test_NEVER_PRINT" },
    { PAYMOS_API_KEY_ID: "pk_test_a", PAYMOS_API_SECRET: "" },
  ])("refuses unsafe credentials before writing (%#)", async bad => {
    const f = fixture();
    await expect(runSetup(["--client", "codex"], bad, f.io, f.context)).rejects.toThrow("complete test key pair");
    expect(existsSync(f.credentials)).toBe(false);
    expect(existsSync(defaultConfigPath("codex", {}, f.context))).toBe(false);
    expect(f.logs.join("\n")).not.toContain("NEVER_PRINT");
  });

  it.each(['{"mcpServers":{"paymos":{"command":"other"}}}', '{"mcpServers":'])
  ("preserves a conflicting/malformed config and writes no keys (%#)", async original => {
    const f = fixture();
    const path = defaultConfigPath("cursor", {}, f.context);
    save(path, original);
    await expect(runSetup(["--client", "cursor"], env, f.io, f.context)).rejects.toThrow();
    expect(readFileSync(path, "utf8")).toBe(original);
    expect(existsSync(f.credentials)).toBe(false);
  });

  it("does not replace another saved pair", async () => {
    const f = fixture();
    const original = JSON.stringify({ apiKeyId: "pk_test_other", apiSecret: "sk_test_other" });
    save(f.credentials, original);
    await expect(runSetup(["--client", "codex"], env, f.io, f.context)).rejects.toThrow("differs");
    expect(readFileSync(f.credentials, "utf8")).toBe(original);
    expect(existsSync(defaultConfigPath("codex", {}, f.context))).toBe(false);
  });

  it("detects a config changed while the user answers prompts", async () => {
    const f = fixture();
    const path = defaultConfigPath("cursor", {}, f.context);
    save(path, "{}");
    const answers = [keys.apiKeyId, keys.apiSecret, ""];
    const io = { ...f.io, interactive: true, ask: async () => {
      save(path, '{"model":"other-writer"}');
      return answers.shift()!;
    } };
    await expect(runSetup(["--client", "cursor", "--sandbox"], {}, io, f.context)).rejects.toThrow("changed during setup");
    expect(readFileSync(path, "utf8")).toBe('{"model":"other-writer"}');
    expect(existsSync(f.credentials)).toBe(false);
  });

  // M36-01. The comparison with the planned snapshot and the rename that publishes the config are
  // two system calls. Two setups that planned from the same config could both pass the comparison,
  // and the later rename then replaced the earlier one's Paymos entry while both reported success.
  it("competing setup for the same destination never silently replaces an entry", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, '{"model":"keep"}');
    const otherCredentials = join(f.home, "second", "keys.json");
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    let competing: Promise<string> | undefined;
    vi.mocked(renameSync).mockImplementationOnce((from, to) => {
      // The first setup has compared and is about to publish. With every value supplied by flags
      // and env, runSetup has no await before its own publication, so the second setup runs to
      // its outcome inside this call, from the same on-disk config the first one planned from.
      competing = runSetup(["--client", "cursor", "--credentials-file", otherCredentials], env, f.io, f.context)
        .then(() => "configured", (cause: unknown) => String(cause));
      actual.renameSync(from, to);
    });
    await runSetup(["--client", "cursor"], env, f.io, f.context);
    expect(await competing).toContain("changed during setup");
    expect(parseJson(readFileSync(config, "utf8"))).toEqual({ model: "keep", mcpServers: { paymos: {
      command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: f.credentials },
    } } });
    // The refused setup published nothing: no second credentials file, no leftover lock.
    expect(existsSync(otherCredentials)).toBe(false);
    expect(existsSync(config + LOCK_SUFFIX)).toBe(false);
  });

  it("refuses while another setup holds the destination and writes nothing", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, '{"model":"keep"}');
    save(config + LOCK_SUFFIX, "other setup");
    await expect(runSetup(["--client", "cursor"], env, f.io, f.context)).rejects.toThrow("changed during setup");
    expect(readFileSync(config, "utf8")).toBe('{"model":"keep"}');
    expect(readFileSync(config + LOCK_SUFFIX, "utf8")).toBe("other setup");
    expect(existsSync(f.credentials)).toBe(false);
  });

  it("is not blocked by a lock left by a setup that did not exit normally", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, '{"model":"keep"}');
    save(config + LOCK_SUFFIX, "crashed setup");
    const hourAgo = new Date(Date.now() - 3_600_000);
    utimesSync(config + LOCK_SUFFIX, hourAgo, hourAgo);
    await runSetup(["--client", "cursor"], env, f.io, f.context);
    expect(parseJson(readFileSync(config, "utf8")).mcpServers.paymos.env.PAYMOS_CREDENTIALS_FILE).toBe(f.credentials);
    expect(existsSync(config + LOCK_SUFFIX)).toBe(false);
  });

  it("releases the destination when publication fails", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, "{}");
    vi.mocked(renameSync).mockImplementationOnce(() => { throw new Error("write denied"); });
    await expect(runSetup(["--client", "cursor"], env, f.io, f.context)).rejects.toThrow("could not save");
    expect(existsSync(config + LOCK_SUFFIX)).toBe(false);
    await runSetup(["--client", "cursor"], env, f.io, f.context);
    expect(readFileSync(config, "utf8")).toContain("PAYMOS_CREDENTIALS_FILE");
  });

  it("dry-run and an unchanged rerun take no lock", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    await runSetup(["--client", "cursor"], env, f.io, f.context);
    // A lock held by someone else would refuse any run that reaches publication.
    save(config + LOCK_SUFFIX, "other setup");
    await runSetup(["--client", "cursor", "--dry-run"], env, f.io, f.context);
    await runSetup(["--client", "cursor"], env, f.io, f.context);
    expect(f.logs.at(-1)).toContain("already matches");
    expect(readFileSync(config + LOCK_SUFFIX, "utf8")).toBe("other setup");
  });

  it("marks secrets hidden and cancellation creates no files", async () => {
    const f = fixture();
    const prompts: boolean[] = [];
    const answers = [keys.apiKeyId, keys.apiSecret, keys.webhookSecret];
    await runSetup(["--client", "cursor", "--sandbox"], {}, { ...f.io, interactive: true, ask: async (_label, secret) => {
      prompts.push(secret); return answers.shift()!;
    } }, f.context);
    expect(prompts).toEqual([false, true, true]);
    const cancelled = fixture();
    await expect(runSetup(["--client", "cursor", "--sandbox"], {}, { ...cancelled.io, interactive: true,
      ask: async () => { throw new Error("cancelled"); } }, cancelled.context)).rejects.toThrow("cancelled");
    expect(existsSync(cancelled.credentials)).toBe(false);
  });

  it("rolls back only newly created keys when publishing the client config fails", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, "{}");
    vi.mocked(renameSync).mockImplementationOnce(() => { throw new Error("write denied"); });
    await expect(runSetup(["--client", "cursor"], env, f.io, f.context)).rejects.toThrow("could not save");
    expect(readFileSync(config, "utf8")).toBe("{}");
    expect(existsSync(f.credentials)).toBe(false);
  });

  it("does not delete another writer's replacement credential file during rollback", async () => {
    const f = fixture();
    const config = defaultConfigPath("cursor", {}, f.context);
    save(config, "{}");
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    vi.mocked(renameSync).mockImplementationOnce(() => {
      // Keep the old inode allocated: an identical replacement is still another file.
      actual.renameSync(f.credentials, f.credentials + ".previous");
      save(f.credentials, JSON.stringify(keys));
      throw new Error("concurrent writer");
    });
    await expect(runSetup(["--client", "cursor"], env, f.io, f.context)).rejects.toThrow("could not save");
    expect(readCredentialFile(f.credentials)).toEqual(keys);
    expect(readFileSync(config, "utf8")).toBe("{}");
  });

  it.skipIf(process.platform === "win32")("refuses symlink targets without overwriting their destination", async () => {
    const f = fixture();
    const destination = join(f.home, "original"); save(destination, "{}");
    const config = join(f.home, "linked"); symlinkSync(destination, config);
    await expect(runSetup(["--client", "generic", "--config", config], env, f.io, f.context)).rejects.toThrow("symbolic link");
    expect(readFileSync(destination, "utf8")).toBe("{}");
    expect(existsSync(f.credentials)).toBe(false);
  });

  it.each([["--client", "invalid"], ["--client"], ["--api-secret", "sk_test_NEVER_PRINT"],
    ["--client", "codex", "--client", "cursor"], ["--dry-run=yes"]].map(argv => ({ argv })))("rejects invalid flags without exposing their values (%#)", async ({ argv }) => {
    const f = fixture();
    let message = "";
    try { await runSetup(argv, env, f.io, f.context); } catch (e) { message = String(e); }
    expect(message).not.toBe("");
    expect(message).not.toContain("NEVER_PRINT");
    expect(existsSync(f.credentials)).toBe(false);
  });

  it("shows help without prompting or writing, and refuses missing noninteractive input", async () => {
    const f = fixture();
    await expect(runSetup(["--help"], {}, f.io, f.context)).resolves.toBe(0);
    expect(f.logs[0]).toContain("Usage:");
    expect(f.logs[0]).toContain("--sandbox");
    expect(existsSync(f.credentials)).toBe(false);
    await expect(runSetup(["--client", "generic"], env, f.io, f.context)).rejects.toThrow("--config");
    await expect(runSetup(["--client", "codex", "--sandbox"], {}, f.io, f.context)).rejects.toThrow("interactive terminal");
  });
});

describe("universal zero-key setup", process.platform === "win32" ? { timeout: 25_000 } : {}, () => {
  const universalRoots: string[] = [];

  function universalFixture(platform: NodeJS.Platform = "linux") {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-setup-u-")));
    universalRoots.push(root);
    const home = join(root, "home");
    const cwd = join(root, "project");
    mkdirSync(home, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    const uEnv = {
      APPDATA: join(root, "Roaming"),
      XDG_CONFIG_HOME: join(root, "xdg-config"),
    };
    const tokenFile = join(root, "tokens", "merchant-oauth.json");
    const logs: string[] = [];
    const io: SetupIO = {
      interactive: false,
      ask: async () => { throw new Error("unexpected prompt"); },
      log: line => logs.push(line),
    };
    return { root, home, cwd, env: uEnv, tokenFile, logs, io, context: { home, cwd, platform } };
  }

  function mockBrowserOAuth(origin = "https://app.paymos.io", mode: "approve" | "deny" | "fail_discovery" = "approve") {
    const issuer = `${origin}/`;
    let openCalls = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      if (mode === "fail_discovery") {
        throw new Error("network unreachable");
      }
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
          access_token: "at_setup_oauth_1",
          refresh_token: "rt_setup_oauth_1",
          expires_in: 300,
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    const openBrowser = vi.fn(async (rawUrl: string) => {
      openCalls++;
      const authUrl = new URL(rawUrl);
      const redirect = new URL(authUrl.searchParams.get("redirect_uri")!);
      redirect.searchParams.set("state", authUrl.searchParams.get("state")!);
      redirect.searchParams.set("iss", issuer);
      if (mode === "deny") {
        redirect.searchParams.set("error", "access_denied");
      } else {
        redirect.searchParams.set("code", "code_setup_1");
      }
      await fetch(redirect);
    });

    return {
      hooks: { fetch: fetchMock, openBrowser },
      getOpenCalls: () => openCalls,
      fetchMock,
      openBrowser,
    };
  }

  afterEach(() => {
    for (const root of universalRoots.splice(0)) rmSync(root, { force: true, recursive: true });
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
  ] as const)("writes connect config for %s without API keys or browser in non-TTY mode", async client => {
    for (const platform of ["win32", "linux"] as const) {
      const f = universalFixture(platform);
      const explicitConfig = client === "generic" || (client === "claude-desktop" && platform === "linux")
        ? join(f.root, "explicit", "mcp.json")
        : undefined;
      const args = ["--client", client, ...(explicitConfig ? ["--config", explicitConfig] : [])];
      const oauth = mockBrowserOAuth();

      await expect(runSetup(args, f.env, f.io, f.context, oauth.hooks)).resolves.toBe(0);
      expect(oauth.getOpenCalls()).toBe(0);
      expect(f.logs.join("\n")).toContain(SETUP_COPY.referenceReady);
      expect(f.logs.join("\n")).toContain(SETUP_COPY.restart);

      const targetPath = explicitConfig ?? defaultConfigPath(client, f.env, f.context);
      const expected = buildConnectEntry(client, "https://app.paymos.io", platform);
      const raw = readFileSync(targetPath, "utf8");
      if (client === "codex") {
        expect(parseToml(raw)).toEqual({ mcp_servers: { paymos: expected } });
      } else if (client === "opencode") {
        expect(parseJson(raw)).toEqual({ mcp: { paymos: expected } });
      } else if (client === "vscode") {
        expect(parseJson(raw)).toEqual({ servers: { paymos: expected } });
      } else if (client === "zcode" || client === "glm") {
        expect(parseJson(raw)).toEqual({ mcp: { servers: { paymos: expected } } });
      } else {
        expect(parseJson(raw)).toEqual({ mcpServers: { paymos: expected } });
      }

      // Idempotent repeat does not re-write and stays exit 0.
      const prevLogsLen = f.logs.length;
      await expect(runSetup(args, f.env, f.io, f.context, oauth.hooks)).resolves.toBe(0);
      expect(readFileSync(targetPath, "utf8")).toBe(raw);
      expect(f.logs.slice(prevLogsLen).join("\n")).toContain("already matches");
      expect(f.logs.slice(prevLogsLen)).not.toContain(SETUP_COPY.restart);
    }
  });

  it("writes IDE configs BEFORE asking [Y/n] and supports y/Enter, n, retry, double-typo fallback, and Ctrl+C", async () => {
    // 1. "y": config exists on disk before ask() is even called; loginWithBrowser runs after.
    const fYes = universalFixture("linux");
    const oauthYes = mockBrowserOAuth("https://dev-local.paymos.io", "approve");
    const seenYesUrls: string[] = [];
    const codexPath = defaultConfigPath("codex", fYes.env, fYes.context);
    save(codexPath, "# keep\n");
    const askYes = vi.fn(async () => {
      expect(readFileSync(codexPath, "utf8")).toContain("connect");
      return "y";
    });
    await expect(
      runSetup(
        ["--origin", "https://dev-local.paymos.io", "--token-file", fYes.tokenFile],
        fYes.env,
        { ...fYes.io, interactive: true, ask: askYes },
        fYes.context,
        { ...oauthYes.hooks, onAuthUrl: url => seenYesUrls.push(url) },
      ),
    ).resolves.toBe(0);
    expect(askYes).toHaveBeenCalledTimes(1);
    expect(oauthYes.getOpenCalls()).toBe(1);
    expect(seenYesUrls).toHaveLength(1);
    expect(seenYesUrls[0]).toMatch(/^https:\/\/dev-local\.paymos\.io\/connect\/authorize\?/);
    const yesOpenIdx = fYes.logs.indexOf(AUTH_COPY.openingBrowser(seenYesUrls[0]!));
    const yesSignedIdx = fYes.logs.indexOf(AUTH_COPY.signedIn("https://dev-local.paymos.io"));
    expect(yesOpenIdx).toBeGreaterThanOrEqual(0);
    expect(yesSignedIdx).toBeGreaterThan(yesOpenIdx);
    expect(readTokenStore(fYes.tokenFile).origins["https://dev-local.paymos.io"]?.access_token).toBe("at_setup_oauth_1");
    expect(fYes.logs.at(-1)).toBe(SETUP_COPY.restart);

    // 2. "" (Enter): same browser login.
    const fEnter = universalFixture("linux");
    const oauthEnter = mockBrowserOAuth();
    save(defaultConfigPath("cursor", fEnter.env, fEnter.context), "{}");
    await expect(
      runSetup(
        ["--token-file", fEnter.tokenFile],
        fEnter.env,
        { ...fEnter.io, interactive: true, ask: async () => "" },
        fEnter.context,
        oauthEnter.hooks,
      ),
    ).resolves.toBe(0);
    expect(oauthEnter.getOpenCalls()).toBe(1);
    expect(fEnter.logs.some(line => line.includes("https://app.paymos.io/connect/authorize?"))).toBe(true);
    expect(fEnter.logs.at(-1)).toBe(SETUP_COPY.restart);

    // 3. "n": keeps written config, 0 browser calls, logs referenceReady + restart, exits 0.
    const fNo = universalFixture("linux");
    const oauthNo = mockBrowserOAuth();
    save(defaultConfigPath("cursor", fNo.env, fNo.context), '{"mcpServers":{}}');
    await expect(
      runSetup([], fNo.env, { ...fNo.io, interactive: true, ask: async () => "n" }, fNo.context, oauthNo.hooks),
    ).resolves.toBe(0);
    expect(oauthNo.getOpenCalls()).toBe(0);
    expect(readFileSync(defaultConfigPath("cursor", fNo.env, fNo.context), "utf8")).toContain("connect");
    expect(fNo.logs.join("\n")).toContain(SETUP_COPY.referenceReady);
    expect(fNo.logs.join("\n")).toContain(SETUP_COPY.restart);

    // 4. First typo then "yes": retries once via offerBrowserRetry, then logs in.
    const fRetry = universalFixture("linux");
    const oauthRetry = mockBrowserOAuth();
    save(defaultConfigPath("cursor", fRetry.env, fRetry.context), "{}");
    const prompts: string[] = [];
    const answers = ["maybe", "yes"];
    await expect(
      runSetup(
        ["--token-file", fRetry.tokenFile],
        fRetry.env,
        {
          ...fRetry.io,
          interactive: true,
          ask: async label => {
            prompts.push(label);
            return answers.shift()!;
          },
        },
        fRetry.context,
        oauthRetry.hooks,
      ),
    ).resolves.toBe(0);
    expect(prompts).toEqual([SETUP_COPY.offerBrowserAuth, SETUP_COPY.offerBrowserRetry]);
    expect(oauthRetry.getOpenCalls()).toBe(1);

    // 5. Two typos: second typo safely falls back to "n" -> exit 0, keeps config, 0 browser calls.
    const fTwoTypos = universalFixture("linux");
    const oauthTwoTypos = mockBrowserOAuth();
    save(defaultConfigPath("cursor", fTwoTypos.env, fTwoTypos.context), "{}");
    const typoAnswers = ["wat", "huh"];
    await expect(
      runSetup(
        [],
        fTwoTypos.env,
        { ...fTwoTypos.io, interactive: true, ask: async () => typoAnswers.shift()! },
        fTwoTypos.context,
        oauthTwoTypos.hooks,
      ),
    ).resolves.toBe(0);
    expect(oauthTwoTypos.getOpenCalls()).toBe(0);
    expect(readFileSync(defaultConfigPath("cursor", fTwoTypos.env, fTwoTypos.context), "utf8")).toContain("connect");
    expect(fTwoTypos.logs.join("\n")).toContain(SETUP_COPY.referenceReady);

    // 6. Ctrl+C / EOF on [Y/n]: keeps written config, 0 browser calls, exits 0.
    const fCtrlC = universalFixture("linux");
    const oauthCtrlC = mockBrowserOAuth();
    save(defaultConfigPath("cursor", fCtrlC.env, fCtrlC.context), "{}");
    await expect(
      runSetup(
        [],
        fCtrlC.env,
        { ...fCtrlC.io, interactive: true, ask: async () => { throw new Error("SIGINT"); } },
        fCtrlC.context,
        oauthCtrlC.hooks,
      ),
    ).resolves.toBe(0);
    expect(oauthCtrlC.getOpenCalls()).toBe(0);
    expect(readFileSync(defaultConfigPath("cursor", fCtrlC.env, fCtrlC.context), "utf8")).toContain("connect");
    expect(fCtrlC.logs.join("\n")).toContain(SETUP_COPY.referenceReady);
  });

  it("keeps written IDE configs when browser OAuth is cancelled (130) or fails (1)", async () => {
    const fDeny = universalFixture("linux");
    const oauthDeny = mockBrowserOAuth("https://app.paymos.io", "deny");
    const cursorPath = defaultConfigPath("cursor", fDeny.env, fDeny.context);
    save(cursorPath, "{}");
    await expect(
      runSetup(
        ["--token-file", fDeny.tokenFile],
        fDeny.env,
        { ...fDeny.io, interactive: true, ask: async () => "y" },
        fDeny.context,
        oauthDeny.hooks,
      ),
    ).resolves.toBe(130);
    expect(parseJson(readFileSync(cursorPath, "utf8")).mcpServers.paymos).toEqual({
      command: "npx",
      args: ["-y", "@paymos/mcp", "connect"],
    });
    expect(fDeny.logs.join("\n")).toContain(SETUP_COPY.loginSkippedAfterConfig);
    expect(fDeny.logs.join("\n")).toContain(SETUP_COPY.restart);

    const fFail = universalFixture("linux");
    const oauthFail = mockBrowserOAuth("https://app.paymos.io", "fail_discovery");
    const codexPath = defaultConfigPath("codex", fFail.env, fFail.context);
    save(codexPath, 'model = "gpt-5"\n');
    await expect(
      runSetup(
        ["--token-file", fFail.tokenFile],
        fFail.env,
        { ...fFail.io, interactive: true, ask: async () => "y" },
        fFail.context,
        oauthFail.hooks,
      ),
    ).resolves.toBe(1);
    expect(parseToml(readFileSync(codexPath, "utf8")).mcp_servers).toEqual({
      paymos: { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
    });
    expect(fFail.logs.join("\n")).toContain("auth_failed:");
    expect(fFail.logs.join("\n")).toContain(SETUP_COPY.loginSkippedAfterConfig);
  });

  it("handles clean-PC zero detected clients, --no-login in TTY, --dry-run, Sandbox coexistence, and legacy HTTP upgrade", async () => {
    // 1. Clean PC non-TTY falls back to claude-code + codex, exit 0, 0 browser calls.
    const fClean = universalFixture("linux");
    const oauthClean = mockBrowserOAuth();
    await expect(runSetup([], fClean.env, fClean.io, fClean.context, oauthClean.hooks)).resolves.toBe(0);
    expect(oauthClean.getOpenCalls()).toBe(0);
    expect(parseJson(readFileSync(defaultConfigPath("claude-code", fClean.env, fClean.context), "utf8")).mcpServers.paymos)
      .toEqual({ command: "npx", args: ["-y", "@paymos/mcp", "connect"] });
    expect(parseToml(readFileSync(defaultConfigPath("codex", fClean.env, fClean.context), "utf8"))).toEqual({
      mcp_servers: { paymos: { command: "npx", args: ["-y", "@paymos/mcp", "connect"] } },
    });

    // 2. Clean PC interactive TTY prompts chooseClient, then --no-login skips [Y/n] prompt.
    const fCleanTty = universalFixture("linux");
    const askChoose = vi.fn(async () => "glm");
    await expect(
      runSetup(["--no-login"], fCleanTty.env, { ...fCleanTty.io, interactive: true, ask: askChoose }, fCleanTty.context),
    ).resolves.toBe(0);
    expect(askChoose).toHaveBeenCalledTimes(1);
    expect(parseJson(readFileSync(defaultConfigPath("zcode", fCleanTty.env, fCleanTty.context), "utf8")).mcp.servers.paymos)
      .toEqual({ command: "npx", args: ["-y", "@paymos/mcp", "connect"] });

    // 3. --dry-run creates no files and opens no browser.
    const fDry = universalFixture("linux");
    const oauthDry = mockBrowserOAuth();
    await expect(
      runSetup(["--client", "kimi", "--dry-run"], fDry.env, fDry.io, fDry.context, oauthDry.hooks),
    ).resolves.toBe(0);
    expect(existsSync(defaultConfigPath("kimi", fDry.env, fDry.context))).toBe(false);
    expect(oauthDry.getOpenCalls()).toBe(0);
    expect(fDry.logs.at(-1)).toContain("No files were changed");

    // 4. Coexists with existing Sandbox entry under paymos-merchant and upgrades legacy HTTP entry.
    const fCoexist = universalFixture("linux");
    const cursorPath = defaultConfigPath("cursor", fCoexist.env, fCoexist.context);
    const sandboxEntry = { command: "npx", args: ["-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "sandbox.json" } };
    save(cursorPath, '{\n// keep cursor\n"mcpServers":{"paymos":' + JSON.stringify(sandboxEntry) + '}}\n');
    await expect(runSetup(["--client", "cursor"], fCoexist.env, fCoexist.io, fCoexist.context)).resolves.toBe(0);
    const coexistRaw = readFileSync(cursorPath, "utf8");
    expect(coexistRaw).toContain("// keep cursor");
    expect(parseJson(coexistRaw)).toEqual({
      mcpServers: {
        paymos: sandboxEntry,
        "paymos-merchant": { command: "npx", args: ["-y", "@paymos/mcp", "connect"] },
      },
    });
  });

  it("rejects mixing Sandbox key flags/env with universal connect flags and rejects invalid origins", async () => {
    const f = universalFixture("linux");
    const mixCases: Array<{ argv: string[]; testEnv: Record<string, string | undefined> }> = [
      { argv: ["--sandbox", "--origin", "https://dev-local.paymos.io"], testEnv: f.env },
      { argv: ["--sandbox", "--token-file", f.tokenFile], testEnv: f.env },
      { argv: ["--sandbox", "--no-login"], testEnv: f.env },
      { argv: ["--credentials-file", join(f.root, "keys.json"), "--origin", "https://dev-local.paymos.io"], testEnv: f.env },
      { argv: ["--no-login"], testEnv: { ...f.env, PAYMOS_API_KEY_ID: "pk_test_1" } },
      { argv: ["--origin", "https://dev-local.paymos.io"], testEnv: { ...f.env, PAYMOS_API_SECRET: "sk_test_1" } },
      { argv: ["--token-file", f.tokenFile], testEnv: { ...f.env, PAYMOS_CREDENTIALS_FILE: join(f.root, "k.json") } },
    ];
    for (const item of mixCases) {
      await expect(runSetup(item.argv, item.testEnv, f.io, f.context)).rejects.toThrow(SETUP_COPY.errors.arguments);
    }

    await expect(
      runSetup(["--client", "codex", "--origin", "http://evil.paymos.io"], f.env, f.io, f.context),
    ).rejects.toThrow(/^invalid_origin:/);
  });
});
