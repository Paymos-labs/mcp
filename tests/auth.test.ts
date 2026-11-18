import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseJson } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAuth } from "../src/auth.js";
import { loadCredentials } from "../src/config.js";
import { main } from "../src/index.js";
import { DestinationBusyError, LOCK_SUFFIX, STALE_LOCK_MS, withDestinationLock } from "../src/setup-lock.js";

vi.mock("node:child_process", async importOriginal => ({
  ...await importOriginal<typeof import("node:child_process")>(), spawn: vi.fn(),
}));
vi.mock("../src/config.js", async importOriginal => ({
  ...await importOriginal<typeof import("../src/config.js")>(), loadCredentials: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);
const roots: string[] = [];
const remoteUrl = "https://app.paymos.io/connect/merchant-mcp";
const codexToml = '[mcp_servers.paymos]\nurl = "' + remoteUrl + '"\nscopes = ["merchant:mcp", "offline_access"]\n'
  + '[mcp_servers.paymos.oauth]\nclient_id = "paymos-merchant-codex"\ncallback_port = 33419\n'
  + 'callback_url = "http://127.0.0.1:33419/callback"\n';
const claudeEntry = {
  type: "http", url: remoteUrl,
  oauth: { clientId: "paymos-merchant-claude-code", callbackPort: 33420, scopes: "merchant:mcp offline_access" },
};
const sandbox = { command: "cmd", args: ["/d", "/c", "npx", "-y", "@paymos/mcp"], env: { PAYMOS_CREDENTIALS_FILE: "sandbox.json" } };

function save(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { mode: 0o700 });
}
function fixture(platform: NodeJS.Platform = "win32") {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-auth-")));
  roots.push(root);
  const home = join(root, "home");
  const project = join(root, "project");
  const cwd = join(project, "nested");
  mkdirSync(home);
  mkdirSync(cwd, { recursive: true });
  mkdirSync(join(project, ".git"));
  const env = {
    ProgramFiles: join(root, "ProgramFiles"), ProgramData: join(root, "ProgramData"),
    APPDATA: join(root, "Roaming"), LOCALAPPDATA: join(root, "Local"),
  };
  const codexConfig = join(home, ".codex", "config.toml");
  const claudeConfig = join(home, ".claude.json");
  const logs: string[] = [];
  const io = { interactive: false, ask: vi.fn<() => Promise<string>>(), log: (text: string) => logs.push(text) };
  return { root, home, project, cwd, env, codexConfig, claudeConfig, logs, io, context: { home, cwd, platform } };
}
type Fixture = ReturnType<typeof fixture>;

function npmBin(f: Fixture, client: "codex" | "claude", path = client === "codex" ? "bin/codex.js" : "cli.js") {
  const name = client === "codex" ? "@openai/codex" : "@anthropic-ai/claude-code";
  const root = join(f.env.APPDATA, "npm", "node_modules", name);
  const binary = join(root, path);
  save(join(root, "package.json"), JSON.stringify({ name, bin: { [client]: path } }));
  save(binary, "fixture only");
  return binary;
}

function childClose(code: number | null, signal: NodeJS.Signals | null = null, duringLogin?: () => void) {
  spawnMock.mockImplementationOnce(() => {
    duringLogin?.();
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", code, signal));
    return child as ReturnType<typeof spawn>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  spawnMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("paymos auth native CLI", () => {
  it("writes Codex's fixed listener and delegates only native login with canonical cwd", async () => {
    const f = fixture();
    const bin = npmBin(f, "codex");
    const alias = join(f.root, "cwd-alias");
    symlinkSync(f.cwd, alias, process.platform === "win32" ? "junction" : "dir");
    save(f.codexConfig, '# keep settings\r\nmodel = "example"\r\n');
    save(join(f.cwd, "codex.cmd"), "untrusted shim");
    const env = { ...f.env, PATH: f.cwd, NODE_OPTIONS: "--require Untrusted", NODE_PATH: f.cwd };
    childClose(0);
    await expect(runAuth(["--client", "codex"], env, f.io, { ...f.context, cwd: alias })).resolves.toBe(0);
    const written = readFileSync(f.codexConfig, "utf8");
    expect(written).toContain('# keep settings\r\nmodel = "example"\r\n');
    expect(parseToml(written)).toEqual({ model: "example", ...parseToml(codexToml) });
    expect(spawnMock).toHaveBeenCalledExactlyOnceWith(realpathSync(process.execPath), [bin, "mcp", "login", "paymos"], {
      cwd: f.cwd, env: { ...f.env, PATH: f.cwd }, shell: false, stdio: "inherit",
    });
    expect(f.io.ask).not.toHaveBeenCalled();
  });

  it("accepts the canonical native Codex release behind the official Windows junction", async () => {
    const f = fixture();
    const release = join(f.home, ".codex", "packages", "standalone", "releases", "0.165.0-x86_64-pc-windows-msvc", "bin");
    const bin = join(release, "codex.exe");
    save(bin, "fixture only");
    const visible = join(f.env.LOCALAPPDATA, "Programs", "OpenAI", "Codex", "bin");
    mkdirSync(dirname(visible), { recursive: true });
    symlinkSync(release, visible, process.platform === "win32" ? "junction" : "dir");
    childClose(0);
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).resolves.toBe(0);
    expect(spawnMock).toHaveBeenCalledExactlyOnceWith(bin, ["mcp", "login", "paymos"], {
      cwd: f.cwd, env: f.env, shell: false, stdio: "inherit",
    });
  });

  it.each(["cli.js", "bin/claude.exe"])("accepts only the known Claude npm bin %s", async layout => {
    const f = fixture();
    const bin = npmBin(f, "claude", layout);
    const js = layout === "cli.js";
    childClose(0);
    await expect(runAuth(["--client=claude-code"], f.env, f.io, f.context)).resolves.toBe(0);
    expect(parseJson(readFileSync(f.claudeConfig, "utf8"))).toEqual({ mcpServers: { paymos: claudeEntry } });
    expect(spawnMock).toHaveBeenCalledExactlyOnceWith(js ? realpathSync(process.execPath) : bin, [
      ...(js ? [bin] : []), "mcp", "login", "paymos",
    ], { cwd: f.cwd, env: f.env, shell: false, stdio: "inherit" });
  });

  it("uses a Unix native launcher and asks only for the client on a terminal", async () => {
    const f = fixture("linux");
    const bin = join(f.home, ".local", "bin", "codex");
    save(bin, "fixture only");
    f.io.ask.mockResolvedValue("codex");
    childClose(0);
    await expect(runAuth([], f.env, { ...f.io, interactive: true }, f.context)).resolves.toBe(0);
    expect(f.io.ask).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("Choose your MCP client"), false);
    expect(spawnMock).toHaveBeenCalledExactlyOnceWith(bin, ["mcp", "login", "paymos"], {
      cwd: f.cwd, env: f.env, shell: false, stdio: "inherit",
    });
  });

  it("fails without a client in noninteractive mode and does not route help through STDIO", async () => {
    const f = fixture();
    await expect(runAuth([], f.env, f.io, f.context)).rejects.toThrow(/^client_required:/);
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(main({}, ["auth", "--help"])).resolves.toBeUndefined();
    expect(output).toHaveBeenCalledWith(expect.stringContaining("paymos auth"));
    for (const command of ["install-secret", "upload-file", "download-file"]) {
      await main({}, [command]).catch(() => {});
    }
    expect(loadCredentials).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps Windows Sandbox and unrelated JSONC settings while adding the merchant alias", async () => {
    const f = fixture();
    const bin = join(f.home, ".local", "bin", "claude.exe");
    save(bin, "fixture only");
    const before = '{\n// leave this comment\n"mcpServers":{"paymos":' + JSON.stringify(sandbox) + '},\n"theme":"dark"\n}\n';
    save(f.claudeConfig, before);
    childClose(0);
    await expect(runAuth(["--client", "claude-code"], f.env, f.io, f.context)).resolves.toBe(0);
    const written = readFileSync(f.claudeConfig, "utf8");
    expect(written).toContain("// leave this comment");
    expect(parseJson(written)).toEqual({ theme: "dark", mcpServers: { paymos: sandbox, "paymos-merchant": claudeEntry } });
    expect(spawnMock).toHaveBeenCalledExactlyOnceWith(bin, ["mcp", "login", "paymos-merchant"], expect.objectContaining({ shell: false }));
  });

  it("does not choose a conflicting Codex project shadow", async () => {
    const f = fixture();
    npmBin(f, "codex");
    save(f.codexConfig, codexToml);
    save(join(f.project, ".codex", "config.toml"), codexToml.replace("33419/callback", "33419/wrong"));
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).rejects.toThrow(/^configuration_conflict:/);
    expect(readFileSync(f.codexConfig, "utf8")).toBe(codexToml);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses an incompatible Claude local shadow even with a matching project entry", async () => {
    const f = fixture();
    npmBin(f, "claude");
    save(join(f.project, ".mcp.json"), JSON.stringify({ mcpServers: { paymos: claudeEntry } }));
    const before = JSON.stringify({
      projects: { [f.project.replaceAll("\\", "/")]: { mcpServers: { paymos: { type: "http", url: "https://foreign.example" } } } },
    });
    save(f.claudeConfig, before);
    await expect(runAuth(["--client", "claude-code"], f.env, f.io, f.context)).rejects.toThrow(/^configuration_conflict:/);
    expect(readFileSync(f.claudeConfig, "utf8")).toBe(before);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not overwrite an occupied merchant alias", async () => {
    const f = fixture();
    npmBin(f, "claude");
    const before = JSON.stringify({ mcpServers: { paymos: sandbox, "paymos-merchant": { command: "other" } } });
    save(f.claudeConfig, before);
    await expect(runAuth(["--client", "claude-code"], f.env, f.io, f.context)).rejects.toThrow(/^configuration_conflict:/);
    expect(readFileSync(f.claudeConfig, "utf8")).toBe(before);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("fails before writing or launching when enterprise scope is unknown", async () => {
    const f = fixture();
    npmBin(f, "claude");
    save(join(f.env.ProgramFiles, "ClaudeCode", "managed-mcp.json"), "{}");
    await expect(runAuth(["--client", "claude-code"], f.env, f.io, f.context)).rejects.toThrow(/^configuration_scope_unknown:/);
    expect(existsSync(f.claudeConfig)).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not discover executables or npm packages from CWD/PATH", async () => {
    const f = fixture();
    for (const filename of ["codex.exe", "codex.cmd", "codex.bat", "codex.ps1"]) save(join(f.cwd, filename), "untrusted");
    const fakeBin = join(f.project, "node_modules", "@openai", "codex", "bin", "codex.js");
    save(fakeBin, "untrusted");
    save(join(dirname(dirname(fakeBin)), "package.json"), '{"name":"@openai/codex","bin":{"codex":"bin/codex.js"}}');
    const env = { ...f.env, PATH: f.cwd };
    await expect(runAuth(["--client", "codex"], env, f.io, f.context)).rejects.toThrow(/^client_installation_unknown:/);
    expect(existsSync(f.codexConfig)).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects an npm installation with a nonofficial manifest or an escaping package layout", async () => {
    const f = fixture();
    const bin = npmBin(f, "codex", "bin/not-codex.js");
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).rejects.toThrow(/^client_installation_unknown:/);
    const packageDir = dirname(dirname(bin));
    rmSync(packageDir, { recursive: true });
    const fake = join(f.project, "masquerading-package");
    save(join(fake, "bin", "codex.js"), "untrusted");
    save(join(fake, "package.json"), '{"name":"@openai/codex","bin":{"codex":"bin/codex.js"}}');
    symlinkSync(fake, packageDir, process.platform === "win32" ? "junction" : "dir");
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).rejects.toThrow(/^client_installation_unknown:/);
    expect(existsSync(f.codexConfig)).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not edit a configuration locked by a concurrent setup", async () => {
    const f = fixture();
    npmBin(f, "codex");
    save(f.codexConfig + LOCK_SUFFIX, "");
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).rejects.toThrow(/^configuration_conflict:/);
    expect(existsSync(f.codexConfig)).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps a newer lock that appeared during a stale-lock check", () => {
    const f = fixture();
    const lock = f.codexConfig + LOCK_SUFFIX;
    save(lock, "stale lock");
    const publish = vi.fn();
    expect(() => withDestinationLock(f.codexConfig, publish, () => {
      renameSync(lock, lock + ".old");
      save(lock, "new holder");
      return Date.now() + STALE_LOCK_MS + 1_000;
    })).toThrow(DestinationBusyError);
    expect(readFileSync(lock, "utf8")).toBe("new holder");
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not clean up a stale lock link as a regular file", () => {
    const f = fixture();
    const lock = f.codexConfig + LOCK_SUFFIX;
    mkdirSync(dirname(lock), { recursive: true });
    symlinkSync(f.cwd, lock, process.platform === "win32" ? "junction" : "dir");
    const publish = vi.fn();
    expect(() => withDestinationLock(f.codexConfig, publish, () => Date.now() + STALE_LOCK_MS + 1_000))
      .toThrow(DestinationBusyError);
    expect(lstatSync(lock).isSymbolicLink()).toBe(true);
    expect(publish).not.toHaveBeenCalled();
  });

  it("restores only its new config on cancellation and leaves any previous native grant alone", async () => {
    const f = fixture();
    npmBin(f, "codex");
    const before = '# keep me\nmodel = "example"\n';
    save(f.codexConfig, before);
    const grant = join(f.home, ".codex", "auth.json");
    save(grant, "existing grant stays with Codex");
    childClose(null, "SIGINT", () => expect(readFileSync(f.codexConfig, "utf8")).toContain(remoteUrl));
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).resolves.toBe(130);
    expect(readFileSync(f.codexConfig, "utf8")).toBe(before);
    expect(readFileSync(grant, "utf8")).toBe("existing grant stays with Codex");
    expect(f.logs.join("\n")).not.toContain("existing grant");
    expect(f.logs.at(-1)).toMatch(/^auth_cancelled:/);
  });

  it("keeps a previous remote configuration on denied reauth and propagates the child's exit code", async () => {
    const f = fixture();
    npmBin(f, "codex");
    save(f.codexConfig, codexToml);
    const { ino } = lstatSync(f.codexConfig);
    childClose(7);
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).resolves.toBe(7);
    expect(readFileSync(f.codexConfig, "utf8")).toBe(codexToml);
    expect(lstatSync(f.codexConfig).ino).toBe(ino);
  });

  it("leaves concurrent edits untouched when the child fails", async () => {
    const f = fixture();
    npmBin(f, "codex");
    const concurrent = '# user made a concurrent change\nmodel = "new"\n';
    childClose(1, null, () => save(f.codexConfig, concurrent));
    await expect(runAuth(["--client", "codex"], f.env, f.io, f.context)).resolves.toBe(1);
    expect(readFileSync(f.codexConfig, "utf8")).toBe(concurrent);
    expect(f.logs[0]).toMatch(/^configuration_restore_skipped:/);
  });
});
