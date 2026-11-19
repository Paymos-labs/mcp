import { existsSync, lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  DEFAULT_ORIGIN, defaultTokenPath, loginWithBrowser, MERCHANT_MCP_RESOURCE_PATH,
  OAuthSessionError, validateOrigin, type OAuthSessionOptions,
} from "./oauth-session.js";
import {
  assertUnchanged, clientConfigSchema, configEntries, defaultConfigPath, equalData,
  normalizeClientName, object, parseConfig, planClientEntry, restoreConfig, SETUP_CLIENTS,
  snapshot, terminalIO, writeConfig,
  type JsonObject, type SetupClient, type SetupContext, type SetupIO, type Snapshot,
} from "./setup.js";
import { AUTH_COPY, SETUP_COPY } from "./setup-copy.js";
import { DestinationBusyError, withDestinationLock } from "./setup-lock.js";

type Env = Readonly<Record<string, string | undefined>>;
type EntryName = "paymos" | "paymos-merchant";
type ErrorCode = keyof typeof AUTH_COPY.errors;

const DISCOVERABLE_CLIENTS: readonly SetupClient[] = [
  "antigravity", "claude-code", "codex", "kimi", "zcode", "cursor", "windsurf", "opencode", "claude-desktop", "vscode",
];

export type AuthSessionHooks = Pick<
  OAuthSessionOptions,
  "fetch" | "openBrowser" | "onAuthUrl" | "now" | "signal" | "loginTimeoutMs" | "lockOptions"
>;

export class AuthError extends Error {
  constructor(readonly code: ErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : `${code}: ${AUTH_COPY.errors[code]}`);
    this.name = "AuthError";
  }
}

function fail(code: ErrorCode, detail?: string): never {
  throw new AuthError(code, detail);
}

interface AuthFlags {
  readonly client?: string;
  readonly config?: string;
  readonly origin?: string;
  readonly tokenFile?: string;
  readonly noLogin: boolean;
  readonly dryRun: boolean;
  readonly help: boolean;
}

function parseAuthFlags(argv: readonly string[]): AuthFlags {
  let client: string | undefined;
  let config: string | undefined;
  let origin: string | undefined;
  let tokenFile: string | undefined;
  let noLogin = false;
  let dryRun = false;
  let help = false;
  const seen = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]!;
    const split = raw.indexOf("=");
    const flag = split < 0 ? raw : raw.slice(0, split);
    const normalized = flag === "-h" ? "--help" : flag;
    if (seen.has(normalized)) fail("arguments");
    seen.add(normalized);

    if (normalized === "--help" || normalized === "--no-login" || normalized === "--dry-run") {
      if (split >= 0) fail("arguments");
      if (normalized === "--help") help = true;
      else if (normalized === "--no-login") noLogin = true;
      else dryRun = true;
      continue;
    }

    if (normalized !== "--client" && normalized !== "--config"
      && normalized !== "--origin" && normalized !== "--token-file") {
      fail("arguments");
    }

    const value = split < 0 ? argv[++i] : raw.slice(split + 1);
    if (value === undefined || value.trim() === "" || value.startsWith("--")) {
      fail("arguments");
    }
    if (normalized === "--client") client = value;
    else if (normalized === "--config") config = value;
    else if (normalized === "--origin") origin = value;
    else tokenFile = value;
  }

  return {
    ...(client !== undefined ? { client } : {}),
    ...(config !== undefined ? { config } : {}),
    ...(origin !== undefined ? { origin } : {}),
    ...(tokenFile !== undefined ? { tokenFile } : {}),
    noLogin,
    dryRun,
    help,
  };
}

function samePath(left: string, right: string, platform: NodeJS.Platform): boolean {
  return platform === "win32"
    ? resolve(left).toLowerCase() === resolve(right).toLowerCase()
    : resolve(left) === resolve(right);
}

function absolute(path: string, context: SetupContext): string {
  if (path === "~") return context.home;
  if (path.startsWith("~/") || path.startsWith("~\\")) return resolve(context.home, path.slice(2));
  return resolve(context.cwd, path);
}

function assertConfigLocation(path: string, platform: NodeJS.Platform): void {
  if (!isAbsolute(path)) fail("configuration_scope_unknown");
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const info = lstatSync(parent, { throwIfNoEntry: false });
    if (info) {
      if (info.isSymbolicLink() || !info.isDirectory() || !samePath(parent, realpathSync(parent), platform)) {
        fail("configuration_scope_unknown");
      }
      return;
    }
    if (parent === dirname(parent)) fail("configuration_scope_unknown");
  }
}

export function isSandboxEntry(value: unknown): boolean {
  if (!object(value) || Object.hasOwn(value, "url") || Object.hasOwn(value, "oauth")) return false;
  if (value.type === "local") {
    return equalData(value.command, ["npx", "-y", "@paymos/mcp"])
      || equalData(value.command, ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp"])
      || equalData(value.command, ["paymos-mcp"]);
  }
  if (value.type !== undefined && value.type !== "stdio") return false;
  return (value.command === "npx" && equalData(value.args, ["-y", "@paymos/mcp"]))
    || (value.command === "cmd" && equalData(value.args, ["/d", "/c", "npx", "-y", "@paymos/mcp"]))
    || (value.command === "paymos-mcp" && (value.args === undefined || equalData(value.args, [])));
}

export function isLegacyMerchantHttpEntry(value: unknown): boolean {
  if (!object(value) || typeof value.url !== "string") return false;
  let parsed: URL;
  try {
    parsed = new URL(value.url);
  } catch {
    return false;
  }
  if (parsed.pathname.replace(/\/+$/, "") !== MERCHANT_MCP_RESOURCE_PATH) return false;
  try {
    validateOrigin(parsed.origin);
    return true;
  } catch {
    return false;
  }
}

export function buildConnectEntry(
  client: SetupClient | "glm",
  origin: string,
  platform: NodeJS.Platform,
): JsonObject {
  const normalized = client === "glm" ? "zcode" : client;
  const command = platform === "win32" ? "cmd" : "npx";
  const args = [
    ...(platform === "win32" ? ["/d", "/c", "npx"] : []),
    "-y",
    "@paymos/mcp",
    "connect",
    ...(origin !== DEFAULT_ORIGIN ? ["--origin", origin] : []),
  ];
  if (normalized === "opencode") {
    return { type: "local", command: [command, ...args], enabled: true };
  }
  if (normalized === "vscode") {
    return { type: "stdio", command, args };
  }
  return { command, args };
}

export function detectInstalledClients(context: SetupContext, env: Env = {}): SetupClient[] {
  const detected: SetupClient[] = [];
  const configHome = env.XDG_CONFIG_HOME || join(context.home, ".config");

  for (const client of DISCOVERABLE_CLIENTS) {
    if (client === "claude-desktop") {
      if (context.platform !== "win32" && context.platform !== "darwin") continue;
      const target = defaultConfigPath(client, env, context);
      if (existsSync(target) || existsSync(dirname(target))) detected.push(client);
      continue;
    }
    if (client === "vscode") {
      const vsDir = lstatSync(join(context.cwd, ".vscode"), { throwIfNoEntry: false });
      if (vsDir?.isDirectory() && !vsDir.isSymbolicLink()) detected.push(client);
      continue;
    }
    if (client === "claude-code") {
      const target = defaultConfigPath(client, env, context);
      if (existsSync(target) || existsSync(join(context.home, ".claude"))) detected.push(client);
      continue;
    }
    if (client === "opencode") {
      if (env.OPENCODE_CONFIG) {
        if (existsSync(env.OPENCODE_CONFIG)) detected.push(client);
        continue;
      }
      const dir = join(configHome, "opencode");
      if (existsSync(join(dir, "opencode.jsonc")) || existsSync(join(dir, "opencode.json")) || existsSync(dir)) {
        detected.push(client);
      }
      continue;
    }
    const target = defaultConfigPath(client, env, context);
    if (existsSync(target) || existsSync(dirname(target))) detected.push(client);
  }

  return detected;
}

export interface TargetPlan {
  readonly client: SetupClient;
  readonly name: EntryName;
  readonly before: Snapshot;
  readonly next: string;
}

export interface ResolveClientsOptions {
  readonly client?: string | undefined;
  readonly config?: string | undefined;
  readonly fallbackClients?: readonly SetupClient[] | undefined;
}

export interface PublishPlansResult {
  readonly wroteAny: boolean;
}

export interface PublishPlanCopy {
  readonly unchanged: (client: SetupClient, path: string, name: EntryName) => string;
  readonly configured: (client: SetupClient, path: string, name: EntryName) => string;
}

function planTargetClient(
  client: SetupClient,
  configPath: string,
  origin: string,
  platform: NodeJS.Platform,
): TargetPlan {
  assertConfigLocation(configPath, platform);
  let before: Snapshot;
  try {
    before = snapshot(configPath);
  } catch (cause) {
    if (cause instanceof Error && cause.message === SETUP_COPY.errors.symlink) {
      fail("configuration_scope_unknown");
    }
    fail("configuration_scope_unknown");
  }

  let root: JsonObject;
  let entries: JsonObject;
  const schema = clientConfigSchema(client);
  try {
    root = parseConfig(schema.format, before.content);
    entries = configEntries(root, schema.groupPath);
  } catch {
    return fail("configuration_scope_unknown");
  }

  const targetEntry = buildConnectEntry(client, origin, platform);
  const hasPaymos = Object.hasOwn(entries, "paymos");
  const hasMerchant = Object.hasOwn(entries, "paymos-merchant");
  const paymosVal = entries.paymos;
  const merchantVal = entries["paymos-merchant"];

  let name: EntryName;
  let replace = false;

  if (!hasPaymos) {
    if (hasMerchant) {
      name = "paymos-merchant";
      if (!equalData(merchantVal, targetEntry)) {
        if (!isLegacyMerchantHttpEntry(merchantVal)) fail("configuration_conflict");
        replace = true;
      }
    } else {
      name = "paymos";
    }
  } else if (equalData(paymosVal, targetEntry)) {
    name = "paymos";
  } else if (isLegacyMerchantHttpEntry(paymosVal)) {
    name = "paymos";
    replace = true;
  } else if (isSandboxEntry(paymosVal)) {
    name = "paymos-merchant";
    if (hasMerchant && !equalData(merchantVal, targetEntry)) {
      if (!isLegacyMerchantHttpEntry(merchantVal)) fail("configuration_conflict");
      replace = true;
    }
  } else {
    fail("configuration_conflict");
  }

  let next: string;
  try {
    next = planClientEntry(client, before.content, name, targetEntry, { replace });
  } catch (cause) {
    if (cause instanceof Error && cause.message === SETUP_COPY.errors.conflict) {
      fail("configuration_conflict");
    }
    return fail("configuration_scope_unknown");
  }

  return { client, name, before, next };
}

function resolveTargetPath(
  client: SetupClient,
  explicitConfig: string | undefined,
  env: Env,
  context: SetupContext,
): string {
  if (explicitConfig !== undefined) {
    return absolute(explicitConfig, context);
  }
  try {
    return absolute(defaultConfigPath(client, env, context), context);
  } catch (cause) {
    if (cause instanceof Error && cause.message === SETUP_COPY.errors.configRequired) {
      fail("config_required");
    }
    fail("configuration_scope_unknown");
  }
}

async function promptForClient(io: SetupIO): Promise<SetupClient[] | null> {
  if (!io.interactive) fail("client_required");
  let chosenRaw: string;
  try {
    chosenRaw = (await io.ask(`${AUTH_COPY.chooseClient} (${SETUP_CLIENTS.join(", ")})`, false)).trim();
  } catch {
    return null;
  }
  const chosen = normalizeClientName(chosenRaw);
  if (!chosen) fail("client_required");
  return [chosen];
}

export async function resolveClientsForSetup(
  options: ResolveClientsOptions,
  env: Env,
  io: SetupIO,
  context: SetupContext,
): Promise<SetupClient[] | null> {
  if (options.client !== undefined) {
    const resolved = normalizeClientName(options.client);
    if (!resolved) fail("client_required");
    return [resolved];
  }
  if (options.config !== undefined) {
    return promptForClient(io);
  }
  const detected = detectInstalledClients(context, env);
  if (detected.length > 0) {
    return detected;
  }
  if (!io.interactive && options.fallbackClients && options.fallbackClients.length > 0) {
    return [...options.fallbackClients];
  }
  return promptForClient(io);
}

export function planConnectTargets(
  clients: readonly SetupClient[],
  explicitConfig: string | undefined,
  origin: string,
  env: Env,
  context: SetupContext,
): TargetPlan[] {
  return clients.map(client => {
    const configPath = resolveTargetPath(client, explicitConfig, env, context);
    return planTargetClient(client, configPath, origin, context.platform);
  });
}

export function publishConnectPlans(
  plans: readonly TargetPlan[],
  io: SetupIO,
  context: SetupContext,
  copy: PublishPlanCopy = AUTH_COPY,
): PublishPlansResult {
  const published: Array<{ readonly plan: TargetPlan; readonly identity: ReturnType<typeof writeConfig> }> = [];
  let wroteAny = false;
  try {
    for (const plan of plans) {
      if (plan.next === plan.before.content) {
        io.log(copy.unchanged(plan.client, plan.before.path, plan.name));
        continue;
      }
      const identity = withDestinationLock(plan.before.path, () => {
        assertConfigLocation(plan.before.path, context.platform);
        assertUnchanged(plan.before);
        return writeConfig(plan.before, plan.next);
      });
      published.push({ plan, identity });
      wroteAny = true;
      io.log(copy.configured(plan.client, plan.before.path, plan.name));
    }
  } catch (cause) {
    for (let i = published.length - 1; i >= 0; i--) {
      const item = published[i]!;
      let restored = false;
      try {
        assertConfigLocation(item.plan.before.path, context.platform);
        restored = withDestinationLock(item.plan.before.path, () => {
          assertConfigLocation(item.plan.before.path, context.platform);
          return restoreConfig(item.plan.before, item.plan.next, item.identity);
        });
      } catch { /* Preserve any concurrent user edits. */ }
      if (!restored) {
        io.log(`configuration_restore_skipped: ${AUTH_COPY.errors.configuration_restore_skipped}`);
      }
    }
    if (cause instanceof AuthError) throw cause;
    if (cause instanceof DestinationBusyError
      || (cause instanceof Error && cause.message === SETUP_COPY.errors.changed)) {
      return fail("configuration_conflict");
    }
    return fail("configuration_write_failed");
  }
  return { wroteAny };
}

export async function runAuth(
  argv: readonly string[],
  env: Env = process.env,
  io: SetupIO = terminalIO(),
  input: SetupContext = { home: homedir(), cwd: process.cwd(), platform: process.platform },
  sessionHooks: AuthSessionHooks = {},
): Promise<number> {
  const flags = parseAuthFlags(argv);
  if (flags.help) {
    io.log(AUTH_COPY.help);
    return 0;
  }

  let origin: string;
  try {
    origin = validateOrigin(flags.origin ?? env.PAYMOS_MCP_ORIGIN);
  } catch {
    fail("invalid_origin");
  }

  let context: SetupContext;
  try {
    context = { ...input, cwd: realpathSync(input.cwd), home: realpathSync(input.home) };
  } catch {
    return fail("configuration_scope_unknown");
  }

  const clients = await resolveClientsForSetup(
    { client: flags.client, config: flags.config },
    env,
    io,
    context,
  );
  if (clients === null) {
    io.log(`auth_cancelled: ${AUTH_COPY.errors.auth_cancelled}`);
    return 130;
  }

  const plans = planConnectTargets(clients, flags.config, origin, env, context);

  if (flags.dryRun) {
    for (const plan of plans) {
      io.log(AUTH_COPY.preview(plan.client, plan.before.path, plan.name));
    }
    return 0;
  }

  if (!flags.noLogin) {
    const tokenFile = flags.tokenFile !== undefined
      ? absolute(flags.tokenFile, context)
      : defaultTokenPath(env, context);
    try {
      await loginWithBrowser({
        origin,
        tokenFile,
        env,
        ...sessionHooks,
      });
      io.log(AUTH_COPY.signedIn(origin));
    } catch (cause) {
      if (cause instanceof OAuthSessionError && (cause.code === "oauth_cancelled" || cause.code === "oauth_denied")) {
        io.log(`auth_cancelled: ${AUTH_COPY.errors.auth_cancelled}`);
        return 130;
      }
      fail("auth_failed");
    }
  }

  const { wroteAny } = publishConnectPlans(plans, io, context);
  if (wroteAny) io.log(AUTH_COPY.restart);
  return 0;
}
