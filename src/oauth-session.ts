import { spawn } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  PrivateStateError, readPrivateFile, withAsyncFileLock, writePrivateFile, type AsyncLockOptions,
} from "./private-state.js";

export const DEFAULT_ORIGIN = "https://app.paymos.io";
export const MERCHANT_MCP_RESOURCE_PATH = "/connect/merchant-mcp";
export const MERCHANT_MCP_SCOPE = "merchant:mcp offline_access";
export const MERCHANT_MCP_LOOPBACK_CLIENT_ID = "paymos-merchant-loopback";

const DEFAULT_TOKEN_LIFETIME_MS = 300_000;
const DEFAULT_EXPIRY_SKEW_MS = 30_000;
const DEFAULT_LOGIN_TIMEOUT_MS = 5 * 60_000;
const DISCOVERY_TIMEOUT_MS = 10_000;

type Env = Readonly<Record<string, string | undefined>>;

export type OAuthSessionErrorCode =
  | "invalid_origin"
  | "invalid_token_store"
  | "oauth_discovery_failed"
  | "oauth_state_mismatch"
  | "oauth_issuer_mismatch"
  | "oauth_denied"
  | "oauth_cancelled"
  | "oauth_timeout"
  | "oauth_refresh_failed"
  | "oauth_failed";

export class OAuthSessionError extends Error {
  constructor(readonly code: OAuthSessionErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "OAuthSessionError";
  }
}

export interface StoredOriginSession {
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly expires_at: number;
  readonly issuer: string;
}

export interface TokenStore {
  readonly version: 1;
  readonly origins: Record<string, StoredOriginSession>;
}

export interface TokenContext {
  readonly home?: string;
  readonly platform?: NodeJS.Platform;
}

export interface OAuthSessionOptions {
  readonly origin?: string;
  readonly tokenFile?: string;
  readonly env?: Env;
  readonly context?: TokenContext;
  readonly fetch?: typeof fetch;
  readonly openBrowser?: (url: string) => Promise<void> | void;
  readonly onAuthUrl?: (url: string) => void;
  readonly onSession?: (session: StoredOriginSession) => void;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly loginTimeoutMs?: number;
  readonly skewMs?: number;
  readonly lockOptions?: AsyncLockOptions;
}

export interface RequireAccessTokenOptions extends OAuthSessionOptions {
  readonly forceRefresh?: boolean;
  readonly failedAccessToken?: string;
}

interface AuthMetadata {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
}

const discoveryCache = new WeakMap<typeof fetch, Map<string, AuthMetadata>>();
const refreshLocks = new Map<string, Promise<string | undefined>>();
const loginLocks = new Map<string, Promise<StoredOriginSession>>();

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function validateOrigin(raw?: string): string {
  if (raw === undefined) return DEFAULT_ORIGIN;
  if (typeof raw !== "string") {
    throw new OAuthSessionError("invalid_origin", "Origin must be a string URL.");
  }
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed !== raw || /[\s\p{Cc}?#@\\]/u.test(raw)) {
    throw new OAuthSessionError("invalid_origin", "Origin contains disallowed characters or whitespace.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new OAuthSessionError("invalid_origin", "Origin is not a valid URL.");
  }
  const schemeSep = trimmed.indexOf("://");
  const authority = schemeSep >= 0 ? trimmed.slice(schemeSep + 3).split("/")[0] ?? "" : "";
  const colonIdx = authority.lastIndexOf(":");
  if (colonIdx >= 0 && /^0/.test(authority.slice(colonIdx + 1))) {
    throw new OAuthSessionError("invalid_origin", "Origin port is invalid.");
  }
  if (parsed.username !== "" || parsed.password !== "" || parsed.search !== "" || parsed.hash !== ""
    || parsed.pathname !== "/" || parsed.origin === "null") {
    throw new OAuthSessionError("invalid_origin", "Origin must not contain credentials, path, query, or hash.");
  }
  if (parsed.port !== "" && (/^0/.test(parsed.port) || Number(parsed.port) <= 0)) {
    throw new OAuthSessionError("invalid_origin", "Origin port is invalid.");
  }
  if (parsed.protocol === "https:") {
    if (parsed.hostname === "") throw new OAuthSessionError("invalid_origin", "Origin host is missing.");
    return parsed.origin;
  }
  if (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)) {
    return parsed.origin;
  }
  throw new OAuthSessionError(
    "invalid_origin",
    "Origin must use https:// or loopback http://127.0.0.1 / http://localhost.",
  );
}

export function defaultTokenPath(env: Env = process.env, context: TokenContext = {}): string {
  const platform = context.platform ?? process.platform;
  const home = context.home ?? homedir();
  if (platform === "win32") {
    const appData = env.APPDATA && env.APPDATA.trim() !== "" ? env.APPDATA : join(home, "AppData", "Roaming");
    return join(appData, "Paymos", "mcp", "merchant-oauth.json");
  }
  const configHome = env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim() !== ""
    ? env.XDG_CONFIG_HOME
    : join(home, ".config");
  return join(configHome, "paymos", "mcp", "merchant-oauth.json");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseTokenStore(raw: string): TokenStore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OAuthSessionError("invalid_token_store", "Token store JSON is invalid.");
  }
  if (!isPlainObject(parsed) || parsed.version !== 1 || !isPlainObject(parsed.origins)) {
    throw new OAuthSessionError("invalid_token_store", "Token store schema is invalid.");
  }
  const origins: Record<string, StoredOriginSession> = {};
  for (const [key, entry] of Object.entries(parsed.origins)) {
    if (!isPlainObject(entry)
      || typeof entry.access_token !== "string" || entry.access_token === ""
      || typeof entry.expires_at !== "number" || !Number.isFinite(entry.expires_at)
      || typeof entry.issuer !== "string" || entry.issuer === ""
      || (entry.refresh_token !== undefined && (typeof entry.refresh_token !== "string" || entry.refresh_token === ""))) {
      throw new OAuthSessionError("invalid_token_store", "Token store session entry is invalid.");
    }
    origins[key] = {
      access_token: entry.access_token,
      ...(entry.refresh_token !== undefined ? { refresh_token: entry.refresh_token } : {}),
      expires_at: entry.expires_at,
      issuer: entry.issuer,
    };
  }
  return { version: 1, origins };
}

export function readTokenStore(tokenPath: string, platform: NodeJS.Platform = process.platform): TokenStore {
  const raw = readPrivateFile(tokenPath, 262_144, platform);
  if (raw === undefined) return { version: 1, origins: {} };
  return parseTokenStore(raw);
}

export function saveTokenStore(
  tokenPath: string,
  store: TokenStore,
  platform: NodeJS.Platform = process.platform,
): void {
  if (store.version !== 1 || !isPlainObject(store.origins)) {
    throw new OAuthSessionError("invalid_token_store", "Token store schema is invalid.");
  }
  writePrivateFile(tokenPath, JSON.stringify(store, null, 2) + "\n", "replace-file", platform);
}

function validateEndpointUrl(raw: unknown, expectedOrigin: string): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata endpoint is missing.");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata endpoint is invalid.");
  }
  if (url.username !== "" || url.password !== "" || url.hash !== "") {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata endpoint contains disallowed parts.");
  }
  if (validateOrigin(url.origin) !== expectedOrigin) {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata endpoint origin mismatch.");
  }
  return url.toString();
}

function combineSignal(external?: AbortSignal, timeoutMs = DISCOVERY_TIMEOUT_MS): AbortSignal {
  const timer = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timer]) : timer;
}

async function discoverAuthMetadata(
  origin: string,
  fetchFn: typeof fetch,
  signal?: AbortSignal,
): Promise<AuthMetadata> {
  let byOrigin = discoveryCache.get(fetchFn);
  if (!byOrigin) {
    byOrigin = new Map();
    discoveryCache.set(fetchFn, byOrigin);
  }
  const cached = byOrigin.get(origin);
  if (cached) return cached;

  let authOrigin = origin;
  try {
    const prmResponse = await fetchFn(`${origin}/.well-known/oauth-protected-resource${MERCHANT_MCP_RESOURCE_PATH}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: combineSignal(signal),
    });
    if (prmResponse.ok) {
      const prm = await prmResponse.json() as unknown;
      if (isPlainObject(prm) && Array.isArray(prm.authorization_servers) && typeof prm.authorization_servers[0] === "string") {
        authOrigin = validateOrigin(prm.authorization_servers[0]);
        if (authOrigin !== origin) {
          throw new OAuthSessionError("oauth_discovery_failed", "Protected resource authorization server origin mismatch.");
        }
      }
    } else {
      void prmResponse.body?.cancel().catch(() => {});
    }
  } catch (cause) {
    if (cause instanceof OAuthSessionError) throw cause;
    // Fall through to authorization server metadata directly unless aborted.
    if (signal?.aborted) throw new OAuthSessionError("oauth_cancelled", "OAuth discovery aborted.");
  }

  let asResponse: Response;
  try {
    asResponse = await fetchFn(`${authOrigin}/.well-known/oauth-authorization-server`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: combineSignal(signal),
    });
  } catch {
    throw new OAuthSessionError("oauth_discovery_failed", "Could not reach OAuth authorization server metadata.");
  }
  if (!asResponse.ok) {
    void asResponse.body?.cancel().catch(() => {});
    throw new OAuthSessionError("oauth_discovery_failed", `OAuth metadata request returned HTTP ${asResponse.status}.`);
  }

  let body: unknown;
  try {
    body = await asResponse.json();
  } catch {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata response was not valid JSON.");
  }
  if (!isPlainObject(body) || typeof body.issuer !== "string" || body.issuer === "") {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata missing issuer.");
  }
  if (validateOrigin(body.issuer) !== authOrigin) {
    throw new OAuthSessionError("oauth_discovery_failed", "OAuth metadata issuer origin mismatch.");
  }
  if (Array.isArray(body.code_challenge_methods_supported) && !body.code_challenge_methods_supported.includes("S256")) {
    throw new OAuthSessionError("oauth_discovery_failed", "Authorization server does not advertise PKCE S256.");
  }
  const metadata: AuthMetadata = {
    issuer: body.issuer,
    authorizationEndpoint: validateEndpointUrl(body.authorization_endpoint, authOrigin),
    tokenEndpoint: validateEndpointUrl(body.token_endpoint, authOrigin),
  };
  byOrigin.set(origin, metadata);
  return metadata;
}

function safeTimingEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function defaultOpenBrowser(url: string): void {
  const platform = process.platform;
  let child;
  if (platform === "win32") {
    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    const powershell = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    child = spawn(powershell, [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Start-Process $env:PAYMOS_OAUTH_URL",
    ], {
      env: { ...process.env, PAYMOS_OAUTH_URL: url },
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
  } else if (platform === "darwin") {
    child = spawn("open", [url], { detached: true, stdio: "ignore" });
  } else {
    child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  }
  child.on("error", () => { /* Ignore headless spawn errors; URL callback timeout handles fallback. */ });
  child.unref();
}

function callbackHtml(title: string, message: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(title)}</title></head>`
    + `<body><h1>${escape(title)}</h1><p>${escape(message)}</p></body></html>`;
}

function parseTokenResponse(raw: unknown, issuer: string, now: () => number, fallbackRefresh?: string): StoredOriginSession {
  if (!isPlainObject(raw) || typeof raw.access_token !== "string" || raw.access_token === "") {
    throw new OAuthSessionError("oauth_failed", "Token response did not contain an access_token.");
  }
  if (raw.token_type !== undefined
    && (typeof raw.token_type !== "string" || raw.token_type.toLowerCase() !== "bearer")) {
    throw new OAuthSessionError("oauth_failed", "Token response returned an unsupported token_type.");
  }
  const expiresInMs = typeof raw.expires_in === "number" && Number.isFinite(raw.expires_in) && raw.expires_in > 0
    ? raw.expires_in * 1000
    : DEFAULT_TOKEN_LIFETIME_MS;
  const refreshToken = typeof raw.refresh_token === "string" && raw.refresh_token !== ""
    ? raw.refresh_token
    : fallbackRefresh;
  return {
    access_token: raw.access_token,
    ...(refreshToken !== undefined ? { refresh_token: refreshToken } : {}),
    expires_at: now() + expiresInMs,
    issuer,
  };
}

function lockKey(tokenPath: string, origin: string, platform: NodeJS.Platform): string {
  const normalizedPath = platform === "win32" ? tokenPath.toLowerCase() : tokenPath;
  return `${normalizedPath}::${origin}`;
}

function resolveSessionParams(options: OAuthSessionOptions) {
  const env = options.env ?? process.env;
  const platform = options.context?.platform ?? process.platform;
  const origin = validateOrigin(options.origin ?? env.PAYMOS_MCP_ORIGIN);
  const tokenPath = options.tokenFile ?? defaultTokenPath(env, options.context);
  const fetchFn = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const skewMs = options.skewMs ?? DEFAULT_EXPIRY_SKEW_MS;
  return { env, platform, origin, tokenPath, fetchFn, now, skewMs };
}

export async function loginWithBrowser(options: OAuthSessionOptions = {}): Promise<StoredOriginSession> {
  if (options.signal?.aborted) {
    throw new OAuthSessionError("oauth_cancelled", "Browser authorization was cancelled.");
  }
  const { platform, origin, tokenPath, fetchFn, now } = resolveSessionParams(options);
  const metadata = await discoverAuthMetadata(origin, fetchFn, options.signal);

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const expectedState = randomBytes(32).toString("base64url");
  const resource = `${origin}${MERCHANT_MCP_RESOURCE_PATH}`;

  let settle!: { resolve: (code: string) => void; reject: (error: Error) => void };
  const callbackPromise = new Promise<string>((resolve, reject) => {
    settle = { resolve, reject };
  });
  callbackPromise.catch(() => {});

  const server = createServer((req, res) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://127.0.0.1");
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Bad request");
      return;
    }
    if (req.method !== "GET" || url.pathname !== "/callback") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Not found");
      return;
    }

    const reply = (status: number, title: string, message: string) => {
      res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(callbackHtml(title, message));
    };

    const gotState = url.searchParams.get("state");
    if (!gotState || !safeTimingEqual(gotState, expectedState)) {
      reply(400, "Paymos sign-in failed", "Authorization state validation failed.");
      settle.reject(new OAuthSessionError("oauth_state_mismatch", "Callback state did not match."));
      return;
    }

    const gotIss = url.searchParams.get("iss");
    if (!gotIss || gotIss !== metadata.issuer) {
      reply(400, "Paymos sign-in failed", "Authorization issuer validation failed.");
      settle.reject(new OAuthSessionError("oauth_issuer_mismatch", "Callback iss did not match expected issuer."));
      return;
    }

    if (url.searchParams.has("error")) {
      reply(400, "Paymos sign-in cancelled", "Authorization was not approved.");
      settle.reject(new OAuthSessionError("oauth_denied", "Authorization was denied or failed."));
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      reply(400, "Paymos sign-in failed", "Authorization code was missing.");
      settle.reject(new OAuthSessionError("oauth_failed", "Authorization code was missing."));
      return;
    }

    reply(200, "Paymos connected", "Sign-in is complete. You can close this window.");
    settle.resolve(code);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  const timeoutMs = options.loginTimeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS;
  const timer = setTimeout(() => {
    settle.reject(new OAuthSessionError("oauth_timeout", "Timed out waiting for browser authorization callback."));
  }, timeoutMs);
  const onAbort = () => {
    settle.reject(new OAuthSessionError("oauth_cancelled", "Browser authorization was cancelled."));
  };
  if (options.signal) {
    if (options.signal.aborted) onAbort();
    else options.signal.addEventListener("abort", onAbort, { once: true });
  }

  let redirectUri = "";
  let code: string;
  try {
    const address = server.address() as AddressInfo;
    redirectUri = `http://127.0.0.1:${address.port}/callback`;
    const authUrl = new URL(metadata.authorizationEndpoint);
    authUrl.searchParams.set("client_id", MERCHANT_MCP_LOOPBACK_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", MERCHANT_MCP_SCOPE);
    authUrl.searchParams.set("resource", resource);
    authUrl.searchParams.set("state", expectedState);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);

    options.onAuthUrl?.(authUrl.toString());
    const opener = options.openBrowser ?? defaultOpenBrowser;
    await opener(authUrl.toString());
    code = await callbackPromise;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: MERCHANT_MCP_LOOPBACK_CLIENT_ID,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
    resource,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetchFn(metadata.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      credentials: "omit",
      redirect: "error",
      signal: combineSignal(options.signal, 30_000),
    });
  } catch {
    throw new OAuthSessionError("oauth_failed", "Failed to exchange authorization code for tokens.");
  }

  if (!tokenResponse.ok) {
    void tokenResponse.body?.cancel().catch(() => {});
    throw new OAuthSessionError("oauth_failed", `Token exchange failed with HTTP ${tokenResponse.status}.`);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await tokenResponse.json();
  } catch {
    throw new OAuthSessionError("oauth_failed", "Token exchange returned invalid JSON.");
  }
  const session = parseTokenResponse(parsedBody, metadata.issuer, now);

  await withAsyncFileLock(tokenPath, () => {
    const store = readTokenStore(tokenPath, platform);
    store.origins[origin] = session;
    saveTokenStore(tokenPath, store, platform);
  }, { platform, ...options.lockOptions });

  options.onSession?.(session);
  return session;
}

async function refreshAccessTokenSingleFlight(
  options: RequireAccessTokenOptions,
  throwOnFailure: boolean,
): Promise<string | undefined> {
  const { platform, origin, tokenPath, fetchFn, now, skewMs } = resolveSessionParams(options);
  const key = lockKey(tokenPath, origin, platform);

  const existing = refreshLocks.get(key);
  if (existing) return existing;

  const task = withAsyncFileLock(tokenPath, async () => {
    const store = readTokenStore(tokenPath, platform);
    const current = store.origins[origin];
    if (!current) return undefined;

    const notExpired = current.expires_at > now() + skewMs;
    if (options.failedAccessToken !== undefined) {
      if (current.access_token !== options.failedAccessToken && notExpired) {
        options.onSession?.(current);
        return current.access_token;
      }
    } else if (!options.forceRefresh && notExpired) {
      options.onSession?.(current);
      return current.access_token;
    }

    if (!current.refresh_token) return undefined;

    const metadata = await discoverAuthMetadata(origin, fetchFn, options.signal);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: MERCHANT_MCP_LOOPBACK_CLIENT_ID,
      refresh_token: current.refresh_token,
      resource: `${origin}${MERCHANT_MCP_RESOURCE_PATH}`,
    });

    let response: Response;
    try {
      response = await fetchFn(metadata.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
        credentials: "omit",
        redirect: "error",
        signal: combineSignal(options.signal, 15_000),
      });
    } catch {
      if (throwOnFailure) throw new OAuthSessionError("oauth_refresh_failed", "Token refresh request failed.");
      return undefined;
    }

    if (response.status === 400 || response.status === 401) {
      void response.body?.cancel().catch(() => {});
      delete store.origins[origin];
      saveTokenStore(tokenPath, store, platform);
      return undefined;
    }

    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (throwOnFailure) {
        throw new OAuthSessionError("oauth_refresh_failed", `Token refresh failed with HTTP ${response.status}.`);
      }
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      if (throwOnFailure) throw new OAuthSessionError("oauth_refresh_failed", "Token refresh returned invalid JSON.");
      return undefined;
    }

    const updated = parseTokenResponse(parsed, current.issuer, now, current.refresh_token);
    store.origins[origin] = updated;
    saveTokenStore(tokenPath, store, platform);
    options.onSession?.(updated);
    return updated.access_token;
  }, { platform, ...options.lockOptions });

  refreshLocks.set(key, task);
  try {
    return await task;
  } finally {
    if (refreshLocks.get(key) === task) refreshLocks.delete(key);
  }
}

export async function tryGetAccessToken(options: RequireAccessTokenOptions = {}): Promise<string | undefined> {
  try {
    const { platform, origin, tokenPath, now, skewMs } = resolveSessionParams(options);
    const store = readTokenStore(tokenPath, platform);
    const current = store.origins[origin];
    if (!current) return undefined;
    options.onSession?.(current);
    if (!options.forceRefresh && current.expires_at > now() + skewMs) {
      return current.access_token;
    }
    if (!current.refresh_token) return undefined;
    return await refreshAccessTokenSingleFlight(options, false);
  } catch (cause) {
    if (cause instanceof OAuthSessionError && cause.code === "invalid_origin") throw cause;
    return undefined;
  }
}

async function silentReadOrRefreshForRequire(options: RequireAccessTokenOptions): Promise<string | undefined> {
  const { platform, origin, tokenPath, now, skewMs } = resolveSessionParams(options);
  let store: TokenStore;
  try {
    store = readTokenStore(tokenPath, platform);
  } catch (cause) {
    if (cause instanceof PrivateStateError) throw cause;
    store = { version: 1, origins: {} };
  }
  const current = store.origins[origin];
  if (!current) return undefined;
  options.onSession?.(current);
  const notExpired = current.expires_at > now() + skewMs;
  if (options.failedAccessToken !== undefined) {
    if (current.access_token !== options.failedAccessToken && notExpired) {
      return current.access_token;
    }
  } else if (!options.forceRefresh && notExpired) {
    return current.access_token;
  }
  if (!current.refresh_token) return undefined;
  return await refreshAccessTokenSingleFlight(options, true);
}

export async function requireAccessToken(options: RequireAccessTokenOptions = {}): Promise<string> {
  const { platform, origin, tokenPath } = resolveSessionParams(options);
  const existingToken = await silentReadOrRefreshForRequire(options);
  if (existingToken !== undefined) return existingToken;

  const key = lockKey(tokenPath, origin, platform);
  const inflight = loginLocks.get(key);
  if (inflight) return (await inflight).access_token;

  const task = (async () => {
    const rechecked = await silentReadOrRefreshForRequire(options);
    if (rechecked !== undefined) {
      const store = readTokenStore(tokenPath, platform);
      const session = store.origins[origin];
      if (session) return session;
    }
    return await loginWithBrowser(options);
  })();

  loginLocks.set(key, task);
  try {
    const session = await task;
    return session.access_token;
  } finally {
    if (loginLocks.get(key) === task) loginLocks.delete(key);
  }
}
