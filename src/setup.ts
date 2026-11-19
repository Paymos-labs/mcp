import {
  chmodSync, closeSync, constants, existsSync, fstatSync, linkSync, lstatSync,
  mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { isDeepStrictEqual } from "node:util";
import { applyEdits, modify, parse as parseJson, parseTree, type Node, type ParseError } from "jsonc-parser";
import { parse as parseToml, stringify as stringifyToml, type TomlTable } from "smol-toml";
import {
  AuthError, planConnectTargets, publishConnectPlans, resolveClientsForSetup, type AuthSessionHooks,
} from "./auth.js";
import type { PaymosMcpCredentials } from "./config.js";
import { readCredentialFile } from "./credential-file.js";
import { checkCredentials } from "./gate.js";
import { defaultTokenPath, loginWithBrowser, OAuthSessionError, validateOrigin } from "./oauth-session.js";
import { AUTH_COPY, SETUP_COPY } from "./setup-copy.js";
import { DestinationBusyError, withDestinationLock } from "./setup-lock.js";

export const SETUP_CLIENTS = [
  "codex", "claude-code", "claude-desktop", "antigravity", "kimi", "zcode", "cursor", "windsurf", "opencode", "vscode", "generic",
] as const;
export type SetupClient = typeof SETUP_CLIENTS[number];
export type ClientSchema = { readonly format: ConfigFormat; readonly groupPath: readonly string[] };
type Env = Readonly<Record<string, string | undefined>>;
export type JsonObject = Record<string, unknown>;
type FileIdentity = { ino: bigint; dev: bigint; birthtimeNs: bigint };
export type Snapshot = { path: string; content: null } | { path: string; content: string; identity: FileIdentity };
export type ConfigFormat = "toml" | "jsonc";

export function normalizeClientName(raw: string): SetupClient | undefined {
  const normalized = raw.trim();
  if (normalized === "glm") return "zcode";
  return (SETUP_CLIENTS as readonly string[]).includes(normalized) ? (normalized as SetupClient) : undefined;
}

export function clientConfigSchema(client: SetupClient | "glm"): ClientSchema {
  const normalized = client === "glm" ? "zcode" : client;
  switch (normalized) {
    case "codex": return { format: "toml", groupPath: ["mcp_servers"] };
    case "opencode": return { format: "jsonc", groupPath: ["mcp"] };
    case "vscode": return { format: "jsonc", groupPath: ["servers"] };
    case "zcode": return { format: "jsonc", groupPath: ["mcp", "servers"] };
    default: return { format: "jsonc", groupPath: ["mcpServers"] };
  }
}

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
  origin?: string;
  tokenFile?: string;
  sandbox: boolean;
  noLogin: boolean;
  dryRun: boolean;
  help: boolean;
}

function error(kind: keyof typeof SETUP_COPY.errors): never {
  throw new Error(SETUP_COPY.errors[kind]);
}

function sameIdentity(a: FileIdentity, b: FileIdentity): boolean {
  return a.ino === b.ino && a.dev === b.dev && a.birthtimeNs === b.birthtimeNs;
}

function options(argv: readonly string[]): SetupOptions {
  const result: SetupOptions = { sandbox: false, noLogin: false, dryRun: false, help: false };
  const seen = new Set<string>();
  const flags = new Map([
    ["--client", "client"],
    ["--config", "config"],
    ["--credentials-file", "credentialsFile"],
    ["--origin", "origin"],
    ["--token-file", "tokenFile"],
  ] as const);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const split = arg.indexOf("=");
    const flag = split < 0 ? arg : arg.slice(0, split);
    const normalized = flag === "-h" ? "--help" : flag;
    if (seen.has(normalized)) error("arguments");
    seen.add(normalized);
    if (normalized === "--help" || normalized === "--dry-run"
      || normalized === "--no-login" || normalized === "--sandbox") {
      if (split >= 0) error("arguments");
      if (normalized === "--help") result.help = true;
      else if (normalized === "--dry-run") result.dryRun = true;
      else if (normalized === "--no-login") result.noLogin = true;
      else result.sandbox = true;
      continue;
    }
    const field = flags.get(
      flag as "--client" | "--config" | "--credentials-file" | "--origin" | "--token-file",
    );
    if (!field) error("arguments");
    const value = split < 0 ? argv[++i] : arg.slice(split + 1);
    if (value === undefined || value.trim() === "" || value.startsWith("--")) error("arguments");
    result[field] = value;
  }
  return result;
}

export function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// smol-toml uses null-prototype tables. Compare their data without treating that
// implementation detail as a user config change; scalar types stay strict.
export function equalData(left: unknown, right: unknown): boolean {
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

export function defaultConfigPath(client: SetupClient | "glm", env: Env, context: SetupContext): string {
  const normalized = client === "glm" ? "zcode" : client;
  const configHome = env.XDG_CONFIG_HOME || join(context.home, ".config");
  switch (normalized) {
    case "codex": return join(env.CODEX_HOME || join(context.home, ".codex"), "config.toml");
    case "claude-code": return join(context.home, ".claude.json");
    case "antigravity": return join(context.home, ".gemini", "config", "mcp_config.json");
    case "kimi": return join(env.KIMI_CODE_HOME || join(context.home, ".kimi-code"), "mcp.json");
    case "zcode": return join(context.home, ".zcode", "cli", "config.json");
    case "cursor": return join(context.home, ".cursor", "mcp.json");
    case "windsurf": return join(context.home, ".codeium", "windsurf", "mcp_config.json");
    case "vscode": return join(context.cwd, ".vscode", "mcp.json");
    case "opencode": {
      if (env.OPENCODE_CONFIG) return env.OPENCODE_CONFIG;
      const jsonc = join(configHome, "opencode", "opencode.jsonc");
      return existsSync(jsonc) ? jsonc : join(configHome, "opencode", "opencode.json");
    }
    case "claude-desktop":
      if (context.platform === "win32") {
        const appData = env.APPDATA && env.APPDATA.trim() !== ""
          ? env.APPDATA
          : join(context.home, "AppData", "Roaming");
        return join(appData, "Claude", "claude_desktop_config.json");
      }
      if (context.platform === "darwin") {
        return join(context.home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      }
      return error("configRequired");
    case "generic": return error("configRequired");
  }
}

export function snapshot(path: string): Snapshot {
  let fd: number | undefined;
  try {
    const stat = lstatSync(path, { bigint: true });
    if (stat.isSymbolicLink()) error("symlink");
    if (!stat.isFile() || stat.size > 4_194_304n) error("configFile");
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fd, { bigint: true });
    // Older Windows libuv reports a zero device for lstat, but not fstat.
    if (opened.ino !== stat.ino || opened.birthtimeNs !== stat.birthtimeNs
      || (stat.dev !== 0n && opened.dev !== stat.dev)) error("changed");
    return { path, content: readFileSync(fd, "utf8"), identity: stat };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { path, content: null };
    if (cause instanceof Error && Object.values(SETUP_COPY.errors).includes(cause.message)) throw cause;
    return error("configFile");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function assertUnchanged(before: Snapshot): void {
  const current = snapshot(before.path);
  if (current.content !== before.content || (current.content !== null && before.content !== null
    && !sameIdentity(current.identity, before.identity))) error("changed");
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

export function parseConfig(format: ConfigFormat, original: string | null): JsonObject {
  if (format === "jsonc") return jsonConfig(original ?? "{}\n");
  try { return parseToml(original ?? ""); } catch { return error("configFile"); }
}

function groupPathArray(group: string | readonly string[]): readonly string[] {
  return typeof group === "string" ? [group] : group;
}

export function configEntries(root: JsonObject, group: string | readonly string[]): JsonObject {
  let current: JsonObject = root;
  for (const segment of groupPathArray(group)) {
    const entries = current[segment];
    if (entries === undefined) return {};
    if (!object(entries)) return error("configFile");
    current = entries;
  }
  return current;
}

function withNestedEntry(
  root: JsonObject,
  path: readonly string[],
  name: string,
  entry: JsonObject,
): JsonObject {
  if (path.length === 0) return { ...root, [name]: entry };
  const [head, ...tail] = path;
  const existing = root[head!];
  const branch = existing === undefined ? {} : (object(existing) ? existing : error("configFile"));
  return { ...root, [head!]: withNestedEntry(branch, tail, name, entry) };
}

function splitTomlHeader(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i]!;
    if (quote) {
      if (ch === "\\" && quote === '"' && i + 1 < header.length) {
        current += header[++i]!;
      } else if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ".") {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

function stripTomlTable(text: string, path: readonly string[], name: string, eol: string): string {
  const target = [...path, name];
  const kept: string[] = [];
  let skipping = false;
  for (const line of text.split(/\r?\n/)) {
    const headerMatch = /^\s*\[{1,2}\s*(.+?)\s*\]{1,2}\s*(?:#.*)?$/.exec(line);
    if (headerMatch) {
      const segments = splitTomlHeader(headerMatch[1]!);
      const matches = segments.length >= target.length && target.every((seg, idx) => segments[idx] === seg);
      skipping = matches;
      if (matches) continue;
    }
    if (!skipping) kept.push(line);
  }
  while (kept.length > 0 && kept[kept.length - 1]!.trim() === "") kept.pop();
  return kept.join(eol);
}

export function planConfigEntry(
  format: ConfigFormat,
  original: string | null,
  group: string | readonly string[],
  name: string,
  entry: JsonObject,
  options?: { readonly replace?: boolean },
): string {
  const path = groupPathArray(group);
  const root = parseConfig(format, original);
  const entries = configEntries(root, path);
  if (Object.hasOwn(entries, name)) {
    if (equalData(entries[name], entry)) return original!;
    if (!options?.replace) error("conflict");
  }
  const text = original ?? (format === "toml" ? "" : "{}\n");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const expected = withNestedEntry(root, path, name, entry);

  if (format === "jsonc") {
    const next = applyEdits(text, modify(text, [...path, name], entry, {
      formattingOptions: { insertSpaces: true, tabSize: 2, eol },
    }));
    if (!equalData(parseConfig(format, next), expected)) error("configFile");
    return next;
  }

  if (path.length !== 1) error("configFile");
  const groupName = path[0]!;
  const block = stringifyToml({ [groupName]: { [name]: entry as TomlTable } }).replace(/\r?\n/g, eol);
  let next: string;
  if (Object.hasOwn(entries, name)) {
    const base = stripTomlTable(text, path, name, eol);
    const candidate = base === "" ? block : base + eol + eol + block;
    try {
      next = equalData(parseConfig("toml", candidate), expected)
        ? candidate
        : stringifyToml(expected as TomlTable).replace(/\r?\n/g, eol);
    } catch {
      next = stringifyToml(expected as TomlTable).replace(/\r?\n/g, eol);
    }
  } else {
    next = text + eol + block;
  }
  if (!equalData(parseConfig(format, next), expected)) error("configFile");
  return next;
}

export function planClientEntry(
  client: SetupClient | "glm",
  original: string | null,
  name: string,
  entry: JsonObject,
  options?: { readonly replace?: boolean },
): string {
  const schema = clientConfigSchema(client);
  return planConfigEntry(schema.format, original, schema.groupPath, name, entry, options);
}

/** All adapters share one launcher; only the client's config envelope varies. */
export function planClientConfig(
  client: SetupClient | "glm", original: string | null, credentialsPath: string, platform: NodeJS.Platform,
): string {
  const normalized = client === "glm" ? "zcode" : client;
  const command = platform === "win32" ? "cmd" : "npx";
  const args = platform === "win32" ? ["/d", "/c", "npx", "-y", "@paymos/mcp"] : ["-y", "@paymos/mcp"];
  const env = { PAYMOS_CREDENTIALS_FILE: credentialsPath };
  const entry = normalized === "opencode"
    ? { type: "local", command: [command, ...args], environment: env, enabled: true }
    : { ...(normalized === "vscode" ? { type: "stdio" } : {}), command, args, env };
  return planClientEntry(normalized, original, "paymos", entry);
}

/** Publish a complete file; an absent target is created without clobbering a new arrival. */
export function writeConfig(before: Snapshot, content: string): FileIdentity {
  mkdirSync(dirname(before.path), { recursive: true, mode: 0o700 });
  const temp = join(dirname(before.path), `.paymos-${randomUUID()}.tmp`);
  let created = false;
  try {
    writeFileSync(temp, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
    created = true;
    if (process.platform !== "win32") chmodSync(temp, 0o600);
    const identity = lstatSync(temp, { bigint: true });
    assertUnchanged(before);
    if (before.content === null) linkSync(temp, before.path);
    else renameSync(temp, before.path);
    return identity;
  } finally {
    if (created && existsSync(temp)) unlinkSync(temp);
  }
}

/** Called under the destination lock; restore only the bytes and file we published. */
export function restoreConfig(before: Snapshot, content: string, identity: FileIdentity): boolean {
  const current = snapshot(before.path);
  if (current.content === null || current.content !== content || !sameIdentity(current.identity, identity)) return false;
  if (before.content === null) unlinkSync(before.path);
  else writeConfig(current, before.content);
  return true;
}

async function ask(io: SetupIO, label: string, secret = false): Promise<string> {
  if (!io.interactive) error("nonInteractive");
  return (await io.ask(label, secret)).trim();
}

export function terminalIO(): SetupIO {
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

function normalizeDir(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

function parseYesNo(raw: string): boolean | undefined {
  const answer = raw.trim().toLowerCase();
  if (answer === "" || answer === "y" || answer === "yes") return true;
  if (answer === "n" || answer === "no") return false;
  return undefined;
}

async function promptBrowserSignIn(io: SetupIO): Promise<boolean> {
  try {
    const first = parseYesNo(await io.ask(SETUP_COPY.offerBrowserAuth, false));
    if (first !== undefined) return first;
    const retry = parseYesNo(await io.ask(SETUP_COPY.offerBrowserRetry, false));
    return retry ?? false;
  } catch {
    return false;
  }
}

async function runLegacySandboxSetup(
  flags: SetupOptions,
  env: Env,
  io: SetupIO,
  context: SetupContext,
): Promise<number> {
  io.log(SETUP_COPY.title);
  const requested = flags.client ?? await ask(io, `${SETUP_COPY.chooseClient} (${SETUP_CLIENTS.join(", ")})`);
  const client = normalizeClientName(requested);
  if (!client) error("client");
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
    return 0;
  }
  if (before.content === next && stored !== undefined) { io.log(SETUP_COPY.unchanged(configPath)); return 0; }
  let createdKeys: FileIdentity | undefined;
  try {
    // `next` was planned from `before`. Under the lock the config is read again and must still
    // be those bytes, so a competing setup for the same destination either meets the lock or
    // meets a config that is no longer its own snapshot; neither can replace the other's entry.
    // Writers that do not take this lock are not covered (see setup-lock.ts).
    withDestinationLock(configPath, () => {
      assertUnchanged(before);
      assertUnchanged(beforeKeys);
      if (stored === undefined) {
        createdKeys = writeConfig(beforeKeys, JSON.stringify(credentials, null, 2) + "\n");
      }
      if (before.content !== next) writeConfig(before, next);
    });
  } catch (cause) {
    if (cause instanceof DestinationBusyError) error("changed");
    // Only remove the exact file created by this invocation, never another writer's data.
    if (createdKeys !== undefined) {
      try {
        const stat = lstatSync(credentialsPath, { bigint: true });
        if (!stat.isSymbolicLink() && sameIdentity(stat, createdKeys)
          && isDeepStrictEqual(readCredentialFile(credentialsPath), credentials)) unlinkSync(credentialsPath);
      } catch { /* Leave changed or unreadable files untouched. */ }
    }
    if (cause instanceof Error && Object.values(SETUP_COPY.errors).includes(cause.message)) throw cause;
    error("write");
  }
  io.log(SETUP_COPY.configured(configPath));
  io.log(SETUP_COPY.restart);
  return 0;
}

export async function runSetup(
  argv: readonly string[],
  env: Env = process.env,
  io: SetupIO = terminalIO(),
  context: SetupContext = { home: homedir(), cwd: process.cwd(), platform: process.platform },
  sessionHooks: AuthSessionHooks = {},
): Promise<number> {
  const flags = options(argv);
  if (flags.help) { io.log(SETUP_COPY.help); return 0; }

  const hasLegacySignal = flags.sandbox
    || flags.credentialsFile !== undefined
    || env.PAYMOS_API_KEY_ID !== undefined
    || env.PAYMOS_API_SECRET !== undefined
    || env.PAYMOS_CREDENTIALS_FILE !== undefined;

  const hasUniversalOnlyFlag = flags.origin !== undefined
    || flags.tokenFile !== undefined
    || flags.noLogin;

  if (hasLegacySignal && hasUniversalOnlyFlag) {
    error("arguments");
  }

  if (hasLegacySignal) {
    return runLegacySandboxSetup(flags, env, io, context);
  }

  let origin: string;
  try {
    origin = validateOrigin(flags.origin ?? env.PAYMOS_MCP_ORIGIN);
  } catch {
    throw new AuthError("invalid_origin");
  }

  const normalizedContext: SetupContext = {
    ...context,
    home: normalizeDir(context.home),
    cwd: normalizeDir(context.cwd),
  };

  io.log(SETUP_COPY.title);
  const clients = await resolveClientsForSetup(
    {
      client: flags.client,
      config: flags.config,
      fallbackClients: ["claude-code", "codex"],
    },
    env,
    io,
    normalizedContext,
  );
  if (clients === null) {
    io.log(SETUP_COPY.errors.cancelled);
    return 130;
  }

  const plans = planConnectTargets(clients, flags.config, origin, env, normalizedContext);
  if (flags.dryRun) {
    for (const plan of plans) {
      io.log(AUTH_COPY.preview(plan.client, plan.before.path, plan.name));
    }
    return 0;
  }

  const { wroteAny } = publishConnectPlans(plans, io, normalizedContext);
  if (!io.interactive || flags.noLogin) {
    io.log(SETUP_COPY.referenceReady);
    if (wroteAny) io.log(SETUP_COPY.restart);
    return 0;
  }

  const wantsLogin = await promptBrowserSignIn(io);
  if (!wantsLogin) {
    io.log(SETUP_COPY.referenceReady);
    if (wroteAny) io.log(SETUP_COPY.restart);
    return 0;
  }

  const tokenFile = flags.tokenFile !== undefined
    ? absolute(flags.tokenFile, normalizedContext)
    : defaultTokenPath(env, normalizedContext);
  try {
    await loginWithBrowser({
      origin,
      tokenFile,
      env,
      ...sessionHooks,
    });
    io.log(AUTH_COPY.signedIn(origin));
    if (wroteAny) io.log(SETUP_COPY.restart);
    return 0;
  } catch (cause) {
    if (cause instanceof OAuthSessionError && (cause.code === "oauth_cancelled" || cause.code === "oauth_denied")) {
      io.log(`auth_cancelled: ${AUTH_COPY.errors.auth_cancelled}`);
      io.log(SETUP_COPY.loginSkippedAfterConfig);
      if (wroteAny) io.log(SETUP_COPY.restart);
      return 130;
    }
    const detail = cause instanceof Error ? cause.message : AUTH_COPY.errors.auth_failed;
    io.log(`auth_failed: ${detail}`);
    io.log(SETUP_COPY.loginSkippedAfterConfig);
    if (wroteAny) io.log(SETUP_COPY.restart);
    return 1;
  }
}
