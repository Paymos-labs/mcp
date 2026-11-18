import { spawn } from "node:child_process";
import { accessSync, constants, lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import {
  assertUnchanged, configEntries, defaultConfigPath, equalData, object, parseConfig,
  planConfigEntry, restoreConfig, snapshot, terminalIO, writeConfig,
  type ConfigFormat, type JsonObject, type SetupContext, type SetupIO, type Snapshot,
} from "./setup.js";
import { AUTH_COPY, SETUP_COPY } from "./setup-copy.js";
import { DestinationBusyError, withDestinationLock } from "./setup-lock.js";

type Client = "codex" | "claude-code";
type Env = Readonly<Record<string, string | undefined>>;
type EntryName = "paymos" | "paymos-merchant";
type ErrorCode = keyof typeof AUTH_COPY.errors;
type Launch = { executable: string; jsBin?: string };

const remoteUrl = "https://app.paymos.io/connect/merchant-mcp";
const remoteEntries: Record<Client, JsonObject> = {
  codex: {
    url: remoteUrl,
    scopes: ["merchant:mcp", "offline_access"],
    oauth: {
      client_id: "paymos-merchant-codex",
      callback_port: 33419,
      callback_url: "http://127.0.0.1:33419/callback",
    },
  },
  "claude-code": {
    type: "http",
    url: remoteUrl,
    oauth: { clientId: "paymos-merchant-claude-code", callbackPort: 33420, scopes: "merchant:mcp offline_access" },
  },
};

class AuthError extends Error {
  constructor(readonly code: ErrorCode) { super(code + ": " + AUTH_COPY.errors[code]); }
}

function fail(code: ErrorCode): never { throw new AuthError(code); }

async function chooseClient(argv: readonly string[], io: SetupIO): Promise<Client> {
  let input: string | undefined;
  if (argv.length === 2 && argv[0] === "--client") input = argv[1];
  else if (argv.length === 1 && argv[0]?.startsWith("--client=")) input = argv[0].slice(9);
  else if (argv.length === 0 && io.interactive) {
    try { input = (await io.ask(AUTH_COPY.chooseClient, false)).trim(); }
    catch { return fail("auth_cancelled"); }
  }
  if (input === "codex" || input === "claude-code") return input;
  return fail("client_required");
}

function samePath(left: string, right: string, platform: NodeJS.Platform): boolean {
  if (platform === "win32") return resolve(left).toLowerCase() === resolve(right).toLowerCase();
  return resolve(left) === resolve(right);
}

function inside(root: string, path: string): boolean {
  const tail = relative(root, path);
  return tail === "" || (tail !== ".." && !tail.startsWith(".." + sep) && !isAbsolute(tail));
}

function stat(path: string) { return lstatSync(path, { throwIfNoEntry: false }); }

/** Check every plausible ancestor layer before handing the same canonical cwd to the client. */
function projectDirectories(context: SetupContext): { dirs: string[]; repository?: string } {
  const dirs: string[] = [];
  for (let dir = context.cwd; ; dir = dirname(dir)) {
    dirs.push(dir);
    if (stat(join(dir, ".git"))) return { dirs, repository: dir };
    if (dir === dirname(dir) || samePath(dir, context.home, context.platform)) return { dirs };
  }
}

function systemRoot(value: string | undefined, fallback: string): string {
  if (value && !isAbsolute(value)) return fail("configuration_scope_unknown");
  return resolve(value || fallback);
}

function windowsPaths(env: Env, home: string) {
  return {
    programFiles: systemRoot(env.ProgramFiles, join(parse(home).root, "Program Files")),
    programData: systemRoot(env.ProgramData, join(parse(home).root, "ProgramData")),
    appData: systemRoot(env.APPDATA, join(home, "AppData", "Roaming")),
    localAppData: systemRoot(env.LOCALAPPDATA, join(home, "AppData", "Local")),
  };
}

/** Resolve only a regular file at a known layout; refuse Windows links and junctions. */
function fixedFile(path: string, platform: NodeJS.Platform, allowedRoot: string = dirname(path)): string | undefined {
  const info = stat(path);
  if (!info) return undefined;
  const real = realpathSync(path);
  if (!inside(allowedRoot, real) || !stat(real)?.isFile()
    || (platform === "win32" && (info.isSymbolicLink() || !samePath(path, real, platform)))) {
    return fail("client_installation_unknown");
  }
  if (platform !== "win32") accessSync(real, constants.X_OK);
  return real;
}

function packageLauncher(modules: string, client: Client, platform: NodeJS.Platform): Launch | undefined {
  const name = client === "codex" ? "@openai/codex" : "@anthropic-ai/claude-code";
  const command = client === "codex" ? "codex" : "claude";
  const root = join(modules, name);
  const info = stat(root);
  if (!info) return undefined;
  if (!info.isDirectory() || !samePath(realpathSync(root), root, platform)) return fail("client_installation_unknown");
  const manifest = parseConfig("jsonc", snapshot(join(root, "package.json")).content);
  const bin = object(manifest.bin) ? manifest.bin[command] : undefined;
  const nativeBin = platform === "win32" ? "bin/claude.exe" : "bin/claude";
  const fixedBins = client === "codex" ? ["bin/codex.js"] : ["cli.js", nativeBin];
  if (manifest.name !== name || typeof bin !== "string" || !fixedBins.includes(bin)) {
    return fail("client_installation_unknown");
  }
  const binary = fixedFile(join(root, bin), platform, root);
  if (!binary) return fail("client_installation_unknown");
  if (bin === nativeBin) return { executable: binary };
  const node = isAbsolute(process.execPath) ? realpathSync(process.execPath) : undefined;
  if (!node || !stat(node)?.isFile()) return fail("client_installation_unknown");
  return { executable: node, jsBin: binary };
}

function resolveLaunch(client: Client, context: SetupContext, env: Env, repository?: string): Launch {
  const { home, platform } = context;
  const command = client === "codex" ? "codex" : "claude";
  const candidates = new Map<string, Launch>();
  const outsideRepository = (path: string) => !repository || !inside(repository, path);
  const add = (launch: Launch | undefined) => {
    if (!launch) return;
    const bin = launch.jsBin ?? launch.executable;
    if (!outsideRepository(bin) || !outsideRepository(launch.executable)) return fail("client_installation_unknown");
    candidates.set(platform === "win32" ? bin.toLowerCase() : bin, launch);
  };
  try {
    if (platform === "win32") {
      const paths = windowsPaths(env, home);
      for (const prefix of [join(paths.appData, "npm"), join(paths.programFiles, "nodejs")]) {
        if (!outsideRepository(prefix)) return fail("client_installation_unknown");
        add(packageLauncher(join(prefix, "node_modules"), client, platform));
      }
      const exe = command + ".exe";
      const installed = client === "codex"
        ? join(paths.localAppData, "Programs", "OpenAI", "Codex", "bin", exe)
        : join(home, ".local", "bin", exe);
      if (stat(installed)) {
        const resolved = realpathSync(installed);
        // Codex's official standalone installer publishes a junction to the selected release.
        // Only accept that known target; neither the visible link nor any arbitrary target is run.
        const releases = join(home, ".codex", "packages", "standalone", "releases");
        if (client === "codex" && !samePath(installed, resolved, platform)) {
          const target = relative(releases, resolved).split(sep).join("/");
          if (!/^[\d][\w.-]*-(?:x86_64|aarch64)-pc-windows-msvc\/(?:bin\/)?codex\.exe$/i.test(target)) {
            return fail("client_installation_unknown");
          }
          add({ executable: fixedFile(resolved, platform, releases)! });
        } else {
          add({ executable: fixedFile(installed, platform)! });
        }
      }
      const wingetRoot = client === "codex" ? "OpenAI.Codex" : "Anthropic.ClaudeCode";
      const wingetName = client === "codex"
        ? "codex-" + (process.arch === "arm64" ? "aarch64" : "x86_64") + "-pc-windows-msvc.exe" : exe;
      for (const base of [join(paths.localAppData, "Microsoft"), paths.programFiles]) {
        const packageDir = join(base, "WinGet", "Packages", wingetRoot + "_Microsoft.Winget.Source_8wekyb3d8bbwe");
        const absolute = fixedFile(join(packageDir, wingetName), platform);
        if (absolute) add({ executable: absolute });
      }
    } else {
      const userBin = join(home, ".local", "bin", command);
      if (stat(userBin)) {
        const releases = client === "codex" ? join(home, ".codex", "packages", "standalone", "releases")
          : join(home, ".local", "share", "claude", "versions");
        const userRoot = stat(userBin)?.isSymbolicLink() ? releases : dirname(userBin);
        const executable = fixedFile(userBin, platform, userRoot);
        if (executable) add({ executable });
      }
      for (const prefix of new Set(["/usr", "/usr/local", "/opt/homebrew", dirname(dirname(process.execPath))])) {
        if (!isAbsolute(prefix) || !outsideRepository(prefix)) continue;
        add(packageLauncher(join(prefix, "lib", "node_modules"), client, platform));
      }
      for (const prefix of ["/usr", "/usr/local", "/opt/homebrew"]) {
        const executable = fixedFile(join(prefix, "bin", command), platform, prefix);
        // npm's symlink is already accounted for by the verified package and fixed JS bin.
        if (executable && !executable.endsWith(".js")) add({ executable });
      }
    }
  } catch { return fail("client_installation_unknown"); }
  if (candidates.size !== 1) return fail("client_installation_unknown");
  return candidates.values().next().value!;
}

function sandboxEntry(value: unknown): boolean {
  if (!object(value) || Object.hasOwn(value, "url") || Object.hasOwn(value, "oauth")
    || (value.type !== undefined && value.type !== "stdio")) return false;
  return (value.command === "npx" && equalData(value.args, ["-y", "@paymos/mcp"]))
    || (value.command === "cmd" && equalData(value.args, ["/d", "/c", "npx", "-y", "@paymos/mcp"]))
    || (value.command === "paymos-mcp" && (value.args === undefined || equalData(value.args, [])));
}

type ConfigPlan = { name: EntryName; before: Snapshot; watched: Snapshot[]; next: string | null };

function assertConfigLocation(path: string, platform: NodeJS.Platform): void {
  if (!isAbsolute(path)) fail("configuration_scope_unknown");
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const info = stat(parent);
    if (info) {
      if (!info.isDirectory() || !samePath(parent, realpathSync(parent), platform)) fail("configuration_scope_unknown");
      return;
    }
    if (parent === dirname(parent)) fail("configuration_scope_unknown");
  }
}

function preflight(client: Client, context: SetupContext, env: Env, dirs: string[]): ConfigPlan {
  const { home, platform } = context;
  const windows = platform === "win32" ? windowsPaths(env, home) : undefined;
  const format = client === "codex" ? "toml" : "jsonc";
  const group = client === "codex" ? "mcp_servers" : "mcpServers";
  const target = defaultConfigPath(client, env, context);
  const watched = new Map<string, Snapshot>();
  const layers: JsonObject[] = [];
  const disabled = new Set<unknown>();
  const read = (path: string, type: ConfigFormat = format) => {
    assertConfigLocation(path, platform);
    let before = watched.get(path);
    if (!before) { before = snapshot(path); watched.set(path, before); }
    return parseConfig(type, before.content);
  };
  const rejectManagedFiles = (paths: string[]) => {
    // Watch absent markers too: a policy appearing before publication invalidates the plan.
    for (const path of paths) {
      if (stat(path)) fail("configuration_scope_unknown");
      watched.set(path, { path, content: null });
    }
  };

  try {
    const user = read(target);
    if (client === "codex") {
      const system = windows ? join(windows.programData, "OpenAI", "Codex") : resolve("/etc/codex");
      rejectManagedFiles([
        join(system, "managed_config.toml"), join(system, "requirements.toml"),
        join(dirname(target), "managed_config.toml"), join(dirname(target), "requirements.toml"),
      ]);
      if (env.CODEX_PROFILE || user.profile !== undefined) fail("configuration_scope_unknown");
      const projects = [join(context.cwd, "config.toml"), ...dirs.map(dir => join(dir, ".codex", "config.toml"))];
      const roots = [
        ...projects.filter(path => !samePath(path, target, platform)).map(path => read(path)),
        user,
        read(join(system, "config.toml")),
      ];
      for (const root of roots) {
        if (root.project_root_markers !== undefined && !equalData(root.project_root_markers, [".git"])) {
          fail("configuration_scope_unknown");
        }
        layers.push(configEntries(root, group));
      }
    } else {
      const userConfig = join(home, ".claude");
      // Alternate home/managed settings are controlled by the native client.
      if (env.CLAUDE_CONFIG_DIR && !samePath(env.CLAUDE_CONFIG_DIR, userConfig, platform)) fail("configuration_scope_unknown");
      const systems = windows ? [join(windows.programFiles, "ClaudeCode"), join(windows.programData, "ClaudeCode")]
        : [resolve(platform === "darwin" ? "/Library/Application Support/ClaudeCode" : "/etc/claude-code")];
      rejectManagedFiles([...systems, userConfig].flatMap(dir =>
        ["managed-mcp.json", "managed-settings.json", "managed-settings.d"].map(name => join(dir, name))));

      const noteDisabled = (root: JsonObject) => {
        for (const key of ["disabledMcpServers", "disabledMcpjsonServers"]) {
          const entries = root[key];
          if (entries === undefined) continue;
          if (!Array.isArray(entries)) return fail("configuration_scope_unknown");
          for (const name of entries) disabled.add(name);
        }
      };
      const localProjects = configEntries(user, "projects");
      for (const dir of dirs) {
        for (const [path, settings] of Object.entries(localProjects)) {
          if (!isAbsolute(path) || !samePath(path, dir, platform)) continue;
          if (!object(settings)) return fail("configuration_scope_unknown");
          layers.push(configEntries(settings, group));
          noteDisabled(settings);
        }
      }
      for (const dir of dirs) layers.push(configEntries(read(join(dir, ".mcp.json")), group));
      layers.push(configEntries(user, group));
      noteDisabled(user);
      const settingsPaths = [join(userConfig, "settings.json"), ...dirs.flatMap(dir =>
        ["settings.json", "settings.local.json"].map(name => join(dir, ".claude", name)))];
      for (const path of settingsPaths) {
        const settings = read(path);
        if (["allowManagedMcpServersOnly", "allowedMcpServers", "deniedMcpServers"]
          .some(key => settings[key] !== undefined)) fail("configuration_scope_unknown");
        noteDisabled(settings);
      }
    }

    const profile = remoteEntries[client];
    const entries = (name: EntryName) => layers.filter(layer => Object.hasOwn(layer, name)).map(layer => layer[name]);
    const primary = entries("paymos");
    const alternate = entries("paymos-merchant");
    // A lower Codex layer can contribute fields even when a higher layer defines the same name.
    // Never ask either native client to resolve an incompatible reserved entry on our behalf.
    if (primary.some(value => !equalData(value, profile) && !sandboxEntry(value))) fail("configuration_conflict");
    const name = primary.some(sandboxEntry) || (primary.length === 0 && alternate.some(value => equalData(value, profile)))
      ? "paymos-merchant" : "paymos";
    const chosen = entries(name);
    if (disabled.has(name) || chosen.some(value => !equalData(value, profile))) fail("configuration_conflict");
    const before = watched.get(target)!;
    const next = chosen.length === 0 ? planConfigEntry(format, before.content, group, name, profile) : before.content;
    return { name, before, next, watched: [...watched.values()] };
  } catch (cause) {
    if (cause instanceof AuthError) throw cause;
    return fail("configuration_scope_unknown");
  }
}

function nativeLogin(launch: Launch, name: EntryName, cwd: string, env: Env): Promise<number> {
  const args = [...(launch.jsBin ? [launch.jsBin] : []), "mcp", "login", name];
  const childEnv = { ...env };
  if (launch.jsBin) {
    // The official Node launcher resolves modules from its package, never from a preload or NODE_PATH.
    for (const key of Object.keys(childEnv)) {
      if (["NODE_OPTIONS", "NODE_PATH"].includes(key.toUpperCase())) delete childEnv[key];
    }
  }
  return new Promise((accept, reject) => {
    let child: ReturnType<typeof spawn> | undefined;
    let signal: NodeJS.Signals | undefined;
    const interrupt = (reason: NodeJS.Signals) => {
      signal ??= reason;
      if (child && child.exitCode === null && child.signalCode === null) child.kill(reason);
    };
    const onInt = () => interrupt("SIGINT");
    const onTerm = () => interrupt("SIGTERM");
    const cleanup = () => {
      process.removeListener("SIGINT", onInt);
      process.removeListener("SIGTERM", onTerm);
    };
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);
    try {
      child = spawn(launch.executable, args, { cwd, env: childEnv, shell: false, stdio: "inherit" });
      child.once("error", () => { cleanup(); reject(new AuthError("auth_failed")); });
      child.once("close", (code, childSignal) => {
        cleanup();
        const reason = signal ?? childSignal;
        accept(reason === "SIGINT" ? 130 : reason === "SIGTERM" ? 143 : code ?? 1);
      });
    } catch {
      cleanup();
      reject(new AuthError("auth_failed"));
    }
  });
}

export async function runAuth(
  argv: readonly string[], env: Env = process.env, io: SetupIO = terminalIO(),
  input: SetupContext = { home: homedir(), cwd: process.cwd(), platform: process.platform },
): Promise<number> {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) { io.log(AUTH_COPY.help); return 0; }
  let client: Client;
  try { client = await chooseClient(argv, io); }
  catch (cause) {
    if (!(cause instanceof AuthError) || cause.code !== "auth_cancelled") throw cause;
    io.log(cause.message);
    return 130;
  }
  let context: SetupContext;
  let project: ReturnType<typeof projectDirectories>;
  try {
    if (env.GIT_DIR || env.GIT_WORK_TREE) return fail("configuration_scope_unknown");
    context = { ...input, cwd: realpathSync(input.cwd), home: realpathSync(input.home) };
    project = projectDirectories(context);
  } catch { return fail("configuration_scope_unknown"); }
  const launch = resolveLaunch(client, context, env, project.repository);
  const plan = preflight(client, context, env, project.dirs);
  const next = plan.next;
  const assertPlanUnchanged = () => {
    for (const before of plan.watched) {
      assertConfigLocation(before.path, context.platform);
      assertUnchanged(before);
    }
  };
  let published: ReturnType<typeof writeConfig> | undefined;
  try {
    if (next !== null && next !== plan.before.content) {
      published = withDestinationLock(plan.before.path, () => {
        assertPlanUnchanged();
        return writeConfig(plan.before, next);
      });
    } else {
      assertPlanUnchanged();
    }
  } catch (cause) {
    if (cause instanceof AuthError) throw cause;
    if (cause instanceof DestinationBusyError || (cause instanceof Error && cause.message === SETUP_COPY.errors.changed)) {
      return fail("configuration_conflict");
    }
    return fail("configuration_write_failed");
  }

  const restore = () => {
    if (published === undefined || next === null) return;
    // No lock spans the interactive login. Keep any intervening user/client edits.
    let restored = false;
    try {
      assertConfigLocation(plan.before.path, context.platform);
      restored = withDestinationLock(plan.before.path, () => {
        assertConfigLocation(plan.before.path, context.platform);
        return restoreConfig(plan.before, next, published!);
      });
    } catch { /* A competing writer or filesystem failure must not overwrite newer settings. */ }
    if (!restored) io.log("configuration_restore_skipped: " + AUTH_COPY.errors.configuration_restore_skipped);
  };
  let code: number;
  try { code = await nativeLogin(launch, plan.name, context.cwd, env); }
  catch (cause) { restore(); throw cause; }
  if (code === 0) return code;
  restore();
  const error = code === 130 || code === 143 ? "auth_cancelled" : "auth_failed";
  io.log(error + ": " + AUTH_COPY.errors[error]);
  return code;
}
