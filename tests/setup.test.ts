import { existsSync, mkdtempSync, mkdirSync, readFileSync, renameSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseJson } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it, vi } from "vitest";
import { defaultConfigPath, planClientConfig, runSetup, type SetupIO } from "../src/setup.js";
import { readCredentialFile } from "../src/credential-file.js";

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
  it.each(["claude-code", "claude-desktop", "kimi", "cursor", "windsurf", "generic"] as const)("adds %s without changing foreign settings/comments", client => {
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
  it.each(["codex", "claude-code", "kimi", "cursor", "windsurf", "opencode", "vscode"] as const)("configures %s with a usable private file and no inline secrets", async client => {
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
  });

  it("reuses a saved private pair when adding another client", async () => {
    const f = fixture();
    save(f.credentials, JSON.stringify(keys));
    await runSetup(["--client", "cursor"], {}, f.io, f.context);
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
    await expect(runSetup(["--client", "cursor"], {}, io, f.context)).rejects.toThrow("changed during setup");
    expect(readFileSync(path, "utf8")).toBe('{"model":"other-writer"}');
    expect(existsSync(f.credentials)).toBe(false);
  });

  it("marks secrets hidden and cancellation creates no files", async () => {
    const f = fixture();
    const prompts: boolean[] = [];
    const answers = [keys.apiKeyId, keys.apiSecret, keys.webhookSecret];
    await runSetup(["--client", "cursor"], {}, { ...f.io, interactive: true, ask: async (_label, secret) => {
      prompts.push(secret); return answers.shift()!;
    } }, f.context);
    expect(prompts).toEqual([false, true, true]);
    const cancelled = fixture();
    await expect(runSetup(["--client", "cursor"], {}, { ...cancelled.io, interactive: true,
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
    await runSetup(["--help"], {}, f.io, f.context);
    expect(f.logs[0]).toContain("Usage:");
    expect(existsSync(f.credentials)).toBe(false);
    await expect(runSetup(["--client", "generic"], env, f.io, f.context)).rejects.toThrow("--config");
    await expect(runSetup(["--client", "codex"], {}, f.io, f.context)).rejects.toThrow("interactive terminal");
  });
});
