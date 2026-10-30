import {
  chmodSync, closeSync, constants, existsSync, fstatSync, linkSync, lstatSync,
  mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { isDeepStrictEqual } from "node:util";
import { applyEdits, modify, parse as parseJson, parseTree, type Node, type ParseError } from "jsonc-parser";
import { parse as parseToml, stringify as stringifyToml, type TomlTable } from "smol-toml";
import type { PaymosMcpCredentials } from "./config.js";
import { readCredentialFile } from "./credential-file.js";
import { checkCredentials } from "./gate.js";
import { SETUP_COPY } from "./setup-copy.js";

export const SETUP_CLIENTS = [
  "codex", "claude-code", "claude-desktop", "kimi", "cursor", "windsurf", "opencode", "vscode", "generic",
] as const;
type SetupClient = typeof SETUP_CLIENTS[number];
type Env = Readonly<Record<string, string | undefined>>;
type JsonObject = Record<string, unknown>;
type Snapshot = { path: string; content: string | null };

export interface SetupIO {
  readonly interactive: boolean;
  ask(label: string, secret: boolean): Promise<string>;
  log(message: string): void;
}
export interface SetupContext {
  readonly home: string;
  readonly cwd: string;
  readonly platform: NodeJS.Platform;
}
interface SetupOptions {
  client?: string;
  config?: string;
  credentialsFile?: string;
  dryRun: boolean;
  help: boolean;
}

function error(kind: keyof typeof SETUP_COPY.errors): never {
  throw new Error(SETUP_COPY.errors[kind]);
}

function options(argv: readonly string[]): SetupOptions {
  const result: SetupOptions = { dryRun: false, help: false };
  const seen = new Set<string>();
  const flags = new Map([
    ["--client", "client"], ["--config", "config"], ["--credentials-file", "credentialsFile"],
  ] as const);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const split = arg.indexOf("=");
    const flag = split < 0 ? arg : arg.slice(0, split);
    const normalized = flag === "-h" ? "--help" : flag;
    if (seen.has(normalized)) error("arguments");
    seen.add(normalized);
    if (normalized === "--help" || normalized === "--dry-run") {
      if (split >= 0) error("arguments");
      if (normalized === "--help") result.help = true;
      else result.dryRun = true;
      continue;
    }
    const field = flags.get(flag as "--client" | "--config" | "--credentials-file");
    if (!field) error("arguments");
    const value = split < 0 ? argv[++i] : arg.slice(split + 1);
    if (value === undefined || value.trim() === "" || value.startsWith("--")) error("arguments");
    result[field] = value;
  }
  return result;
}

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// smol-toml uses null-prototype tables. Compare their data without treating that
// implementation detail as a user config change; scalar types stay strict.
function equalData(left: unknown, right: unknown): boolean {
  if (isDeepStrictEqual(left, right)) return true;
  if (!object(left) || !object(right)) return false;
  const plain = (value: object) => Object.getPrototypeOf(value) === null || Object.getPrototypeOf(value) === Object.prototype;
  if (!plain(left) || !plain(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key =>
    Object.hasOwn(right, key) && equalData(left[key], right[key]));
}

function absolute(path: string, context: SetupContext): string {
  if (path === "~") return context.home;
  if (path.startsWith("~/") || path.startsWith("~\\")) return resolve(context.home, path.slice(2));
  return resolve(context.cwd, path);
}

export function defaultConfigPath(client: SetupClient, env: Env, context: SetupContext): string {
  const configHome = env.XDG_CONFIG_HOME || join(context.home, ".config");
  switch (client) {
    case "codex": return join(env.CODEX_HOME || join(context.home, ".codex"), "config.toml");
    case "claude-code": return join(context.home, ".claude.json");
    case "kimi": return join(env.KIMI_CODE_HOME || join(context.home, ".kimi-code"), "mcp.json");
    case "cursor": return join(context.home, ".cursor", "mcp.json");
    case "windsurf": return join(context.home, ".codeium", "windsurf", "mcp_config.json");
    case "vscode": return join(context.cwd, ".vscode", "mcp.json");
    case "opencode": {
      if (env.OPENCODE_CONFIG) return env.OPENCODE_CONFIG;
      const jsonc = join(configHome, "opencode", "opencode.jsonc");
      return existsSync(jsonc) ? jsonc : join(configHome, "opencode", "opencode.json");
    }
    case "claude-desktop":
      if (context.platform === "win32" && env.APPDATA)
        return join(env.APPDATA, "Claude", "claude_desktop_config.json");
      if (context.platform === "darwin")
        return join(context.home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      return error("configRequired");
    case "generic": return error("configRequired");
  }
}

function snapshot(path: string): Snapshot {
  let fd: number | undefined;
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) error("symlink");
    if (!stat.isFile() || stat.size > 4_194_304) error("configFile");
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    if (fstatSync(fd).ino !== stat.ino) error("changed");
    return { path, content: readFileSync(fd, "utf8") };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { path, content: null };
    if (cause instanceof Error && Object.values(SETUP_COPY.errors).includes(cause.message)) throw cause;
    return error("configFile");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function assertUnchanged(before: Snapshot): void {
  if (snapshot(before.path).content !== before.content) error("changed");
}

function assertUniqueKeys(node: Node): void {
  if (node.type === "object") {
    const keys = new Set<string>();
    for (const property of node.children ?? []) {
      const key = property.children?.[0]?.value as string;
      if (keys.has(key)) error("configFile");
      keys.add(key);
    }
  }
  for (const child of node.children ?? []) assertUniqueKeys(child);
}

function jsonConfig(text: string): JsonObject {
  const errors: ParseError[] = [];
  const value: unknown = parseJson(text, errors, { allowTrailingComma: true, allowEmptyContent: false });
  const tree = parseTree(text, [], { allowTrailingComma: true });
  if (errors.length !== 0 || !object(value) || !tree) error("configFile");
  assertUniqueKeys(tree);
  return value;
}

/** All adapters share one launcher; only the client's config envelope varies. */
export function planClientConfig(
  client: SetupClient, original: string | null, credentialsPath: string, platform: NodeJS.Platform,
): string {
  const command = platform === "win32" ? "cmd" : "npx";
  const args = platform === "win32" ? ["/d", "/c", "npx", "-y", "@paymos/mcp"] : ["-y", "@paymos/mcp"];
  const env = { PAYMOS_CREDENTIALS_FILE: credentialsPath };
  const entry = client === "opencode"
    ? { type: "local", command: [command, ...args], environment: env, enabled: true }
    : { ...(client === "vscode" ? { type: "stdio" } : {}), command, args, env };
  const text = original ?? "{}\n";
  if (client === "codex") {
    let root: TomlTable;
    try { root = parseToml(original ?? ""); } catch { return error("configFile"); }
    const servers = root.mcp_servers;
    if (servers !== undefined && !object(servers)) error("configFile");
    const existing = (servers as JsonObject | undefined)?.paymos;
    if (existing !== undefined) {
      if (!equalData(existing, entry)) error("conflict");
      return original!;
    }
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const block = stringifyToml({ mcp_servers: { paymos: entry } }).replace(/\r?\n/g, eol);
    const next = (original ?? "") + eol + block;
    try {
      const expected = { ...root, mcp_servers: { ...(servers as JsonObject | undefined), paymos: entry } };
      if (!equalData(parseToml(next), expected)) error("configFile");
    } catch { return error("configFile"); }
    return next;
  }
  const root = jsonConfig(text);
  const group = client === "opencode" ? "mcp" : client === "vscode" ? "servers" : "mcpServers";
  const servers = root[group];
  if (servers !== undefined && !object(servers)) error("configFile");
  const existing = (servers as JsonObject | undefined)?.paymos;
  if (existing !== undefined) {
    if (!isDeepStrictEqual(existing, entry)) error("conflict");
    return text;
  }
  const next = applyEdits(text, modify(text, [group, "paymos"], entry, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: text.includes("\r\n") ? "\r\n" : "\n" },
  }));
  const expected = { ...root, [group]: { ...(servers as JsonObject | undefined), paymos: entry } };
  if (!isDeepStrictEqual(jsonConfig(next), expected)) error("configFile");
  return next;
}

/** Publish a complete file; an absent target is created without clobbering a new arrival. */
function writeConfig(before: Snapshot, content: string): { ino: number; dev: number } {
  mkdirSync(dirname(before.path), { recursive: true, mode: 0o700 });
  const temp = join(dirname(before.path), `.paymos-${randomUUID()}.tmp`);
  let created = false;
  try {
    writeFileSync(temp, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
    created = true;
    if (process.platform !== "win32") chmodSync(temp, 0o600);
    const identity = lstatSync(temp);
    assertUnchanged(before);
    if (before.content === null) linkSync(temp, before.path);
    else renameSync(temp, before.path);
    return { ino: identity.ino, dev: identity.dev };
  } finally {
    if (created && existsSync(temp)) unlinkSync(temp);
  }
}

async function ask(io: SetupIO, label: string, secret = false): Promise<string> {
  if (!io.interactive) error("nonInteractive");
  return (await io.ask(label, secret)).trim();
}

function terminalIO(): SetupIO {
  return {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    log: message => console.log(message),
    ask: (label, secret) => new Promise((accept, reject) => {
      let muted = false;
      const output = new Writable({ write(chunk, _encoding, done) {
        if (!muted) process.stdout.write(chunk);
        done();
      } });
      const reader = createInterface({ input: process.stdin, output, terminal: true });
      let settled = false;
      const cancel = () => {
        if (settled) return;
        settled = true;
        muted = false;
        process.stdout.write("\n");
        reader.close();
        reject(new Error(SETUP_COPY.errors.cancelled));
      };
      reader.once("SIGINT", cancel);
      reader.once("close", () => { if (!settled) cancel(); });
      process.stdout.write(`${label}: `);
      muted = secret;
      reader.question("", answer => {
        settled = true;
        muted = false;
        if (secret) process.stdout.write("\n");
        reader.close();
        accept(answer);
      });
    }),
  };
}

export async function runSetup(
  argv: readonly string[], env: Env = process.env, io: SetupIO = terminalIO(),
  context: SetupContext = { home: homedir(), cwd: process.cwd(), platform: process.platform },
): Promise<void> {
  const flags = options(argv);
  if (flags.help) { io.log(SETUP_COPY.help); return; }
  io.log(SETUP_COPY.title);
  const requested = flags.client ?? await ask(io, `${SETUP_COPY.chooseClient} (${SETUP_CLIENTS.join(", ")})`);
  if (!(SETUP_CLIENTS as readonly string[]).includes(requested)) error("client");
  const client = requested as SetupClient;
  const configPath = absolute(flags.config ?? defaultConfigPath(client, env, context), context);
  const credentialsPath = absolute(flags.credentialsFile ?? env.PAYMOS_CREDENTIALS_FILE
    ?? join(env.XDG_CONFIG_HOME || join(context.home, ".config"), "paymos", "mcp", "credentials.json"), context);
  const samePath = context.platform === "win32"
    ? configPath.toLowerCase() === credentialsPath.toLowerCase() : configPath === credentialsPath;
  if (samePath || !isAbsolute(configPath) || !isAbsolute(credentialsPath)) error("conflict");
  const before = snapshot(configPath);
  const beforeKeys = snapshot(credentialsPath);
  const stored = beforeKeys.content === null ? undefined : readCredentialFile(credentialsPath);
  const apiKeyId = (env.PAYMOS_API_KEY_ID ?? stored?.apiKeyId ?? await ask(io, SETUP_COPY.apiKey)).trim();
  const apiSecret = (env.PAYMOS_API_SECRET ?? stored?.apiSecret ?? await ask(io, SETUP_COPY.apiSecret, true)).trim();
  const webhookSecret = (env.PAYMOS_WEBHOOK_SECRET ?? stored?.webhookSecret
    ?? (io.interactive ? await ask(io, SETUP_COPY.webhookSecret, true) : "")).trim();
  const credentials: PaymosMcpCredentials = {
    apiKeyId, apiSecret, ...(webhookSecret === "" ? {} : { webhookSecret }),
  };
  if (!checkCredentials(credentials).ok) error("credentials");
  if (stored !== undefined && !isDeepStrictEqual(stored, credentials)) error("conflict");
  const next = planClientConfig(client, before.content, credentialsPath, context.platform);
  if (flags.dryRun) {
    io.log(SETUP_COPY.preview(configPath));
    io.log(SETUP_COPY.preview(credentialsPath));
    return;
  }
  if (before.content === next && stored !== undefined) { io.log(SETUP_COPY.unchanged(configPath)); return; }
  let createdKeys: { ino: number; dev: number } | undefined;
  try {
    assertUnchanged(before);
    assertUnchanged(beforeKeys);
    if (stored === undefined) {
      createdKeys = writeConfig(beforeKeys, JSON.stringify(credentials, null, 2) + "\n");
    }
    if (before.content !== next) writeConfig(before, next);
  } catch (cause) {
    // Only remove the exact file created by this invocation, never another writer's data.
    if (createdKeys !== undefined) {
      try {
        const stat = lstatSync(credentialsPath);
        if (!stat.isSymbolicLink() && stat.ino === createdKeys.ino && stat.dev === createdKeys.dev
          && isDeepStrictEqual(readCredentialFile(credentialsPath), credentials)) unlinkSync(credentialsPath);
      } catch { /* Leave changed or unreadable files untouched. */ }
    }
    if (cause instanceof Error && Object.values(SETUP_COPY.errors).includes(cause.message)) throw cause;
    error("write");
  }
  io.log(SETUP_COPY.configured(configPath));
  io.log(SETUP_COPY.restart);
}
