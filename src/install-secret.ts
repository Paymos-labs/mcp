import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readdirSync, realpathSync, unlinkSync, type BigIntStats } from "node:fs";
import { userInfo } from "node:os";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import type { ReadableStreamReadResult } from "node:stream/web";
import { parseEnv } from "node:util";
import { MerchantDeliveryError } from "./gate.js";
import { assertUnchanged, object, parseConfig, snapshot, writeConfig } from "./setup.js";
import { withDestinationLock } from "./setup-lock.js";

const origin = "https://app.paymos.io";
const resource = "/connect/merchant-mcp";
const lifetimeMs = 5 * 60_000;
const requestTimeoutMs = 60_000;
const stateFolder = ".paymos-mcp-delivery";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

// Windows PowerShell 5.1's .NET Framework APIs can supply an ACL when creating
// the object. A protected directory gives its lock files the same SID-only ACL.
const windowsStateScript = String.raw`
using namespace System.IO
using namespace System.Security.AccessControl
using namespace System.Security.Principal

$ErrorActionPreference = 'Stop'
try {
  $path = [Environment]::GetEnvironmentVariable('PAYMOS_DELIVERY_STATE_PATH')
  $action = [Environment]::GetEnvironmentVariable('PAYMOS_DELIVERY_STATE_ACTION')
  $sid = [WindowsIdentity]::GetCurrent().User
  $rights = [FileSystemRights]::FullControl
  $sections = [AccessControlSections]'Access, Owner'

  function New-PrivateAcl([bool] $directory) {
    if ($directory) {
      $acl = [DirectorySecurity]::new()
      $inheritance = [InheritanceFlags]'ContainerInherit, ObjectInherit'
    } else {
      $acl = [FileSecurity]::new()
      $inheritance = [InheritanceFlags]::None
    }
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule([FileSystemAccessRule]::new($sid, $rights, $inheritance,
      [PropagationFlags]::None, [AccessControlType]::Allow))
    return $acl
  }

  function Assert-OrdinaryPath([string] $item, [bool] $directory) {
    $attributes = [File]::GetAttributes($item)
    if (($attributes -band [FileAttributes]::ReparsePoint) -or
        ([bool]($attributes -band [FileAttributes]::Directory) -ne $directory)) {
      throw 'Unexpected filesystem object'
    }
  }

  function Assert-PrivateAcl([FileSystemSecurity] $acl, [AceFlags] $flags) {
    $descriptor = [RawSecurityDescriptor]::new($acl.GetSecurityDescriptorBinaryForm(), 0)
    if (!$acl.AreAccessRulesProtected -or $descriptor.Owner.Value -ne $sid.Value -or
        $descriptor.DiscretionaryAcl.Count -ne 1) { throw 'Unexpected state ACL' }
    $rule = $descriptor.DiscretionaryAcl[0]
    if ($rule.AceType -ne [AceType]::AccessAllowed -or $rule.AceFlags -ne $flags -or
        $rule.AccessMask -ne [int]$rights -or $rule.SecurityIdentifier.Value -ne $sid.Value) {
      throw 'Unexpected state access rule'
    }
  }

  function Assert-PrivateDirectory([string] $directory) {
    Assert-OrdinaryPath $directory $true
    Assert-PrivateAcl ([Directory]::GetAccessControl($directory, $sections)) ([AceFlags]'ContainerInherit, ObjectInherit')
  }

  switch ($action) {
    'write-file' {
      $directory = [Path]::GetDirectoryName($path)
      Assert-OrdinaryPath ([Path]::GetDirectoryName($directory)) $true
      [void][Directory]::CreateDirectory($directory, (New-PrivateAcl $true))
      Assert-PrivateDirectory $directory
      $staged = [Path]::Combine($directory, '.paymos-' + [Guid]::NewGuid().ToString('N') + '.tmp')
      $file = [FileStream]::new($staged, [FileMode]::CreateNew, $rights,
        [FileShare]::None, 4096, [FileOptions]::None, (New-PrivateAcl $false))
      try {
        try {
          Assert-PrivateAcl ($file.GetAccessControl()) ([AceFlags]::None)
          [Console]::OpenStandardInput().CopyTo($file)
          $file.Flush($true)
        } finally { $file.Dispose() }
        # Same-directory move keeps the protected ACL and refuses to replace an existing file.
        [File]::Move($staged, $path)
      } catch {
        [File]::Delete($staged)
        throw
      }
    }
    'check-file' {
      Assert-PrivateDirectory ([Path]::GetDirectoryName($path))
      Assert-OrdinaryPath $path $false
      Assert-PrivateAcl ([File]::GetAccessControl($path, $sections)) ([AceFlags]::None)
    }
    default { throw 'Unexpected action' }
  }
} catch { exit 1 }
`;

export type DeliveryKind = "install-secret" | "upload-file" | "download-file";
type Scope = { merchantId: string; environment: "sandbox" | "production"; operationId: string };
export type UploadDescriptor = { byte_length: number; content_sha256: string; content_type: string };
export type DeliveryTarget = { directory: string; path: string; platform: NodeJS.Platform };
type Prepare = { prepare: true; file: string; scope: Scope };
type Redeem = { prepare: false; file: string; requestId: string; ticket: string };
type LocalProof = Scope & { requestId: string; verifier: string; expiresAt: number };

export interface DeliveryRuntime {
  cwd: string;
  home: string;
  platform: NodeJS.Platform;
  now(): number;
  fetch: typeof fetch;
  stdout(line: string): void;
}

export function defaultDeliveryRuntime(): DeliveryRuntime {
  return {
    cwd: process.cwd(),
    home: userInfo().homedir,
    platform: process.platform,
    now: Date.now,
    fetch: globalThis.fetch,
    stdout: line => console.log(line),
  };
}

export function failDelivery(code: MerchantDeliveryError["code"]): never {
  throw new MerchantDeliveryError(code);
}

export async function safeDelivery(action: () => Promise<void>): Promise<void> {
  try { await action(); }
  catch (error) {
    if (error instanceof MerchantDeliveryError) throw error;
    failDelivery("delivery_local_io_failed");
  }
}

function isBase64Url(value: unknown, length: number): value is string {
  if (typeof value !== "string" || value.length !== Math.ceil(length * 4 / 3) || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const bytes = Buffer.from(value, "base64url");
  return bytes.length === length && bytes.toString("base64url") === value;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value) && value !== "00000000-0000-0000-0000-000000000000";
}

export function deliveryArguments(argv: readonly string[], kind: DeliveryKind): Prepare | Redeem {
  const fileOption = kind === "install-secret" ? "--env-file" : "--file";
  const common = [fileOption, "--merchant-id", "--environment", "--operation-id", "--request-id", "--token"];
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flags.has(flag)) failDelivery("delivery_arguments");
    if (flag === "--prepare") { flags.set(flag, ""); continue; }
    if (!common.includes(flag)) failDelivery("delivery_arguments");
    const value = argv[++i];
    if (!value || value.startsWith("--")) failDelivery("delivery_arguments");
    flags.set(flag, value);
  }
  const file = flags.get(fileOption);
  if (!file) return failDelivery("delivery_arguments");
  if (flags.has("--prepare")) {
    const merchantId = flags.get("--merchant-id")?.toLowerCase();
    const operationId = flags.get("--operation-id")?.toLowerCase();
    const environment = flags.get("--environment")?.toLowerCase();
    if (flags.size !== 5 || !validUuid(merchantId) || !validUuid(operationId)
      || (environment !== "sandbox" && environment !== "production")) return failDelivery("delivery_arguments");
    return { prepare: true, file, scope: { merchantId, environment, operationId } };
  }
  const requestId = flags.get("--request-id");
  const ticket = flags.get("--token");
  const prefix = kind === "install-secret" ? "otk_" : "ftk_";
  if (flags.size !== 3 || !isBase64Url(requestId, 32) || !ticket?.startsWith(prefix)
    || !isBase64Url(ticket.slice(prefix.length), kind === "upload-file" ? 48 : 32)) {
    return failDelivery("delivery_arguments");
  }
  return { prepare: false, file, requestId, ticket };
}

function pathStat(path: string) { return lstatSync(path, { bigint: true, throwIfNoEntry: false }); }

export function sameOpenFile(path: BigIntStats, opened: BigIntStats): boolean {
  return path.isFile() && opened.isFile() && path.ino === opened.ino && path.birthtimeNs === opened.birthtimeNs
    && (path.dev === 0n || opened.dev === 0n || path.dev === opened.dev);
}

function samePath(left: string, right: string, platform: NodeJS.Platform): boolean {
  return platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function inside(directory: string, path: string): boolean {
  const child = relative(directory, path);
  return child !== ".." && !child.startsWith(".." + sep) && !isAbsolute(child);
}

function ordinaryDirectory(path: string, platform: NodeJS.Platform): boolean {
  return !!pathStat(path)?.isDirectory() && samePath(realpathSync(path), path, platform);
}

type WindowsStateAction = "write-file" | "check-file";

function windowsStateAcl(action: WindowsStateAction, path: string, input?: string): void {
  const systemRoot = process.env.SystemRoot;
  if (process.platform !== "win32" || !systemRoot || !/^[A-Za-z]:[\\/]/.test(systemRoot)) {
    return failDelivery("delivery_state_unavailable");
  }
  const windows = resolve(systemRoot);
  const executable = join(windows, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (!pathStat(executable)?.isFile() || !samePath(realpathSync(executable), executable, "win32")) {
    return failDelivery("delivery_state_unavailable");
  }
  const result = spawnSync(executable, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(windowsStateScript, "utf16le").toString("base64"),
  ], {
    cwd: windows, shell: false, stdio: [input === undefined ? "ignore" : "pipe", "ignore", "ignore"],
    input, timeout: 10_000, windowsHide: true,
    env: { SystemRoot: windows, PAYMOS_DELIVERY_STATE_ACTION: action, PAYMOS_DELIVERY_STATE_PATH: path },
  });
  if (result.error || result.status !== 0) return failDelivery("delivery_state_unavailable");
}

export function assertDeliveryTarget(target: DeliveryTarget): BigIntStats | undefined {
  try {
    const segments = relative(target.directory, target.path).split(sep);
    let folder = target.directory;
    if (!ordinaryDirectory(folder, target.platform)) failDelivery("delivery_unsafe_path");
    for (const segment of segments.slice(0, -1)) {
      folder = join(folder, segment);
      if (!ordinaryDirectory(folder, target.platform)) failDelivery("delivery_unsafe_path");
    }
    const stat = pathStat(target.path);
    if (stat && (!stat.isFile() || stat.nlink !== 1n || !samePath(realpathSync(target.path), target.path, target.platform))) {
      failDelivery("delivery_unsafe_path");
    }
    return stat;
  } catch { return failDelivery("delivery_unsafe_path"); }
}

export function deliveryTarget(file: string, runtime: DeliveryRuntime): DeliveryTarget {
  const tail = file.slice(parse(file).root.length);
  const segments = tail.split(/[\\/]/);
  if (/\p{Cc}/u.test(file) || /^[\\/]{2}/.test(file) || segments.some(segment => segment === ".." || segment.toLowerCase() === ".git")
    || (runtime.platform === "win32" && /^[a-z]:/i.test(file) && !isAbsolute(file))
    || (runtime.platform === "win32" && segments.some(segment =>
      /[:*?"<>|]/.test(segment) || (segment !== "." && /[. ]$/.test(segment))
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)))
    || (runtime.platform !== "win32" && file.includes("\\"))) return failDelivery("delivery_unsafe_path");
  const directory = realpathSync(runtime.cwd);
  const path = resolve(directory, file);
  if (path === directory || !inside(directory, path)) return failDelivery("delivery_unsafe_path");
  const target = { directory, path, platform: runtime.platform };
  assertDeliveryTarget(target);
  return target;
}

function stateDirectory(runtime: DeliveryRuntime, target: DeliveryTarget, create: boolean): string {
  try {
    const home = resolve(runtime.home);
    if (!isAbsolute(runtime.home) || !ordinaryDirectory(home, runtime.platform)) failDelivery("delivery_state_unavailable");
    const base = runtime.platform === "win32" ? join(home, "AppData", "Local") : home;
    if (!ordinaryDirectory(base, runtime.platform)) return failDelivery("delivery_state_unavailable");
    const directory = join(base, stateFolder);
    if (inside(target.directory, directory) || inside(directory, target.path)) failDelivery("delivery_unsafe_path");
    let stat = pathStat(directory);
    if (!stat && create) {
      // The Windows helper applies the DACL in the same call that creates the directory.
      if (runtime.platform === "win32") return directory;
      try { mkdirSync(directory, { mode: 0o700 }); }
      catch (cause) { if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause; }
      stat = pathStat(directory);
    }
    if (!stat?.isDirectory() || !ordinaryDirectory(directory, runtime.platform)
      || (runtime.platform !== "win32" && !privateMode(stat))) {
      return failDelivery("delivery_state_unavailable");
    }
    return directory;
  } catch (cause) {
    if (cause instanceof MerchantDeliveryError) throw cause;
    return failDelivery("delivery_state_unavailable");
  }
}

function privateMode(stat: BigIntStats): boolean {
  return (stat.mode & 0o077n) === 0n && (process.geteuid === undefined || stat.uid === BigInt(process.geteuid()));
}

function removeExpiredState(directory: string, runtime: DeliveryRuntime, justWritten?: string): void {
  const cutoff = runtime.now() - lifetimeMs;
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    if (file.name === justWritten || !file.isFile() || !/^[A-Za-z0-9_-]{43}\.json$/.test(file.name)) continue;
    const path = join(directory, file.name);
    const stat = pathStat(path);
    if (stat?.isFile() && stat.nlink === 1n && Number(stat.mtimeMs) <= cutoff) {
      try {
        if (runtime.platform === "win32") windowsStateAcl("check-file", path);
        unlinkSync(path);
      } catch { /* Expiration is still checked when reading state. */ }
    }
  }
}

export function prepareDelivery(
  kind: DeliveryKind, scope: Scope, target: DeliveryTarget, runtime: DeliveryRuntime, upload?: UploadDescriptor,
): void {
  const directory = stateDirectory(runtime, target, true);
  const requestId = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const now = runtime.now();
  const filename = requestId + ".json";
  const path = join(directory, filename);
  const state = JSON.stringify({
    origin, kind, ...scope, requestId, verifier, createdAt: now, expiresAt: now + lifetimeMs,
    target: target.path, directory: target.directory, upload,
  });
  if (runtime.platform === "win32") {
    // The helper copies stdin into the file only after verifying both protected ACLs.
    windowsStateAcl("write-file", path, state);
    removeExpiredState(directory, runtime, filename);
  } else {
    removeExpiredState(directory, runtime);
    writeConfig({ path, content: null }, state);
  }
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  runtime.stdout(JSON.stringify({ request_id: requestId, challenge, ...upload }));
}

/** Claims the local proof before any network attempt, under the same lock for all commands. */
export function claimDelivery(
  kind: DeliveryKind, input: Redeem, target: DeliveryTarget, runtime: DeliveryRuntime, upload?: UploadDescriptor,
): LocalProof {
  const directory = stateDirectory(runtime, target, false);
  const path = join(directory, input.requestId + ".json");
  try {
    const checked = runtime.platform === "win32" ? pathStat(path) : undefined;
    if (runtime.platform === "win32") {
      if (!checked?.isFile() || checked.nlink !== 1n || checked.size > 4096n) {
        return failDelivery("delivery_state_unavailable");
      }
      // Check the directory and the specific protected file before creating the lock or reading the proof.
      windowsStateAcl("check-file", path);
    }
    return withDestinationLock(path, () => {
      const stat = pathStat(path);
      if (!stat?.isFile() || stat.nlink !== 1n || stat.size > 4096n
        || (checked ? !sameOpenFile(checked, stat) : !privateMode(stat))) {
        return failDelivery("delivery_state_unavailable");
      }
      const before = snapshot(path);
      if (before.content === null || stat.ino !== before.identity.ino || stat.dev !== before.identity.dev
        || stat.birthtimeNs !== before.identity.birthtimeNs) return failDelivery("delivery_state_unavailable");
      const state = parseConfig("jsonc", before.content);
      const now = runtime.now();
      if (state.origin !== origin || state.requestId !== input.requestId || !isBase64Url(state.verifier, 32)
        || !validUuid(state.merchantId) || !validUuid(state.operationId)
        || (state.environment !== "sandbox" && state.environment !== "production")
        || typeof state.createdAt !== "number" || typeof state.expiresAt !== "number"
        || !Number.isSafeInteger(state.createdAt) || !Number.isSafeInteger(state.expiresAt)
        || state.createdAt > now || state.expiresAt <= state.createdAt || state.expiresAt - state.createdAt > lifetimeMs) {
        return failDelivery("delivery_state_unavailable");
      }
      const consume = () => {
        if (checked) {
          const current = pathStat(path);
          if (!current || !sameOpenFile(stat, current) || current.nlink !== 1n || current.size !== stat.size
            || current.mtimeNs !== stat.mtimeNs || current.ctimeNs !== stat.ctimeNs) {
            return failDelivery("delivery_state_unavailable");
          }
        } else assertUnchanged(before);
        unlinkSync(path);
      };
      if (state.expiresAt <= now) {
        consume();
        return failDelivery("delivery_state_unavailable");
      }
      if (state.kind !== kind || state.directory !== target.directory || state.target !== target.path
        || (upload && (!object(state.upload) || upload.byte_length !== state.upload.byte_length
          || upload.content_sha256 !== state.upload.content_sha256 || upload.content_type !== state.upload.content_type))
        || (!upload && state.upload !== undefined)) return failDelivery("delivery_context_mismatch");
      consume();
      return {
        requestId: input.requestId, verifier: state.verifier, expiresAt: state.expiresAt,
        merchantId: state.merchantId, environment: state.environment, operationId: state.operationId,
      };
    });
  } catch (cause) {
    if (cause instanceof MerchantDeliveryError) throw cause;
    return failDelivery("delivery_state_unavailable");
  }
}

export function checkDeliveryExpiry(proof: LocalProof, runtime: DeliveryRuntime): void {
  if (runtime.now() >= proof.expiresAt) failDelivery("delivery_state_unavailable");
}

export async function redeemDelivery(
  kind: DeliveryKind, input: Redeem, proof: LocalProof, runtime: DeliveryRuntime,
  upload?: { bytes: Buffer; descriptor: UploadDescriptor },
): Promise<Response> {
  checkDeliveryExpiry(proof, runtime);
  const install = kind === "install-secret";
  const url = origin + resource + (install ? "/tickets/secret/redeem" : "/files/" + input.ticket);
  const headers = new Headers({ "Accept-Encoding": "identity", "Cache-Control": "no-store" });
  let body: RequestInit["body"];
  if (install) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify({ ticket: input.ticket, request_id: proof.requestId, verifier: proof.verifier });
  } else {
    headers.set("Paymos-Delivery-Request", proof.requestId);
    headers.set("Paymos-Delivery-Verifier", proof.verifier);
    if (upload) {
      headers.set("Content-Type", upload.descriptor.content_type);
      body = upload.bytes;
    }
  }
  let response: Response;
  try {
    response = await runtime.fetch(url, {
      method: kind === "download-file" ? "GET" : "POST",
      headers, ...(body === undefined ? {} : { body }),
      credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(Math.max(1, Math.min(requestTimeoutMs, proof.expiresAt - runtime.now()))),
    });
  } catch { return failDelivery("delivery_request_failed"); }
  if (response.redirected || (response.url && response.url !== url) || response.status !== (kind === "upload-file" ? 204 : 200)) {
    void response.body?.cancel().catch(() => {});
    if (response.status === 413) return failDelivery("delivery_file_too_large");
    if (response.status === 404 || response.status === 410) return failDelivery("delivery_unavailable");
    return failDelivery("delivery_request_failed");
  }
  return response;
}

export function responseType(response: Response): string | undefined {
  return response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
}

export async function streamDelivery(
  response: Response, limit: number, write: (chunk: Uint8Array) => Promise<void> | void,
): Promise<number> {
  const rawLength = response.headers.get("Content-Length");
  const encoding = response.headers.get("Content-Encoding");
  const advertised = rawLength === null || (encoding && encoding !== "identity") ? undefined : Number(rawLength);
  if (advertised !== undefined && (!/^\d+$/.test(rawLength!) || !Number.isSafeInteger(advertised)
    || advertised > limit)) return failDelivery("delivery_file_too_large");
  if (!response.body) return failDelivery("delivery_invalid_response");
  const reader = response.body.getReader();
  let bytes = 0;
  let completed = false;
  try {
    while (true) {
      let next: ReadableStreamReadResult<Uint8Array>;
      try { next = await reader.read(); }
      catch { return failDelivery("delivery_request_failed"); }
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > limit) failDelivery("delivery_file_too_large");
      if (advertised !== undefined && bytes > advertised) failDelivery("delivery_invalid_response");
      await write(next.value);
    }
    if (advertised !== undefined && bytes !== advertised) failDelivery("delivery_invalid_response");
    completed = true;
    return bytes;
  } finally {
    if (!completed) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const secretKeys = {
  payment: ["PAYMOS_API_KEY", "PAYMOS_API_SECRET"],
  payout: ["PAYMOS_PAYOUT_API_KEY", "PAYMOS_PAYOUT_API_SECRET"],
  webhook: ["PAYMOS_WEBHOOK_SECRET"],
  invite: ["PAYMOS_INVITE_LINK"],
} as const;

async function redeemedFields(response: Response, proof: LocalProof): Promise<Record<string, string>> {
  if (responseType(response) !== "application/json") return failDelivery("delivery_invalid_response");
  const chunks: Uint8Array[] = [];
  await streamDelivery(response, 16_384, chunk => { chunks.push(chunk); });
  let body: Record<string, unknown>;
  try { body = parseConfig("jsonc", new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { return failDelivery("delivery_invalid_response"); }
  if (body.request_id !== proof.requestId || body.merchant_id !== proof.merchantId
    || body.environment !== proof.environment || body.operation_id !== proof.operationId) {
    return failDelivery("delivery_context_mismatch");
  }
  const kind = body.kind;
  if (typeof kind !== "string" || !Object.hasOwn(secretKeys, kind) || !object(body.fields)) {
    return failDelivery("delivery_invalid_response");
  }
  const keys = secretKeys[kind as keyof typeof secretKeys];
  if (Object.keys(body).length !== 7 || body.suggested_env_key !== keys[0] || Object.keys(body.fields).length !== keys.length) {
    return failDelivery("delivery_invalid_response");
  }
  const fields: Record<string, string> = {};
  for (const key of keys) {
    const value = body.fields[key];
    if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value, "utf8") > 4096
      || /['\p{Cc}]/u.test(value)) return failDelivery("delivery_invalid_response");
    fields[key] = value;
  }
  return fields;
}

function mergeEnv(original: string, fields: Record<string, string>): string {
  if (original.includes("\uFFFD")) return failDelivery("delivery_local_io_failed");
  const bom = original.startsWith("\uFEFF") ? "\uFEFF" : "";
  const text = original.slice(bom.length);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const before = parseEnv(text);
  const kept = text.split(/(?<=\n)/).filter(line => {
    const assignment = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line);
    if (!assignment || !Object.hasOwn(fields, assignment[1]!)) return true;
    const value = line.slice(assignment[0].length).trim();
    const quote = value[0];
    if ((quote === "'" || quote === '"' || quote === "\x60") && value.indexOf(quote, 1) < 0) {
      failDelivery("delivery_local_io_failed");
    }
    return false;
  }).join("");
  const lines = Object.entries(fields).map(([key, value]) => key + "='" + value + "'" + eol).join("");
  const next = kept + (kept === "" || kept.endsWith("\n") ? "" : eol) + lines;
  const parsed = parseEnv(next);
  // Removing an apparent assignment inside a multiline value must never change
  // any unrelated setting. Refuse an ambiguous existing file.
  const expected = { ...before, ...fields };
  if (Object.keys(parsed).length !== Object.keys(expected).length
    || Object.entries(expected).some(([key, value]) => parsed[key] !== value)) return failDelivery("delivery_local_io_failed");
  return bom + next;
}

export async function runInstallSecret(argv: readonly string[], runtime?: DeliveryRuntime): Promise<void> {
  return safeDelivery(async () => {
    const input = deliveryArguments(argv, "install-secret");
    const io = runtime ?? defaultDeliveryRuntime();
    const target = deliveryTarget(input.file, io);
    const before = snapshot(target.path);
    if (input.prepare) {
      prepareDelivery("install-secret", input.scope, target, io);
      return;
    }
    const proof = claimDelivery("install-secret", input, target, io);
    const response = await redeemDelivery("install-secret", input, proof, io);
    const fields = await redeemedFields(response, proof);
    withDestinationLock(target.path, () => {
      checkDeliveryExpiry(proof, io);
      assertDeliveryTarget(target);
      assertUnchanged(before);
      writeConfig(before, mergeEnv(before.content ?? "", fields));
    });
    io.stdout(JSON.stringify({ status: "installed" }));
  });
}
