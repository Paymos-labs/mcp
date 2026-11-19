import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync, closeSync, constants, existsSync, fstatSync, linkSync, lstatSync,
  mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync,
  type BigIntStats,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

// Windows PowerShell 5.1's .NET Framework APIs can supply an ACL when creating
// the object. A protected directory gives its lock files the same SID-only ACL.
const windowsStateScript = String.raw`
using namespace System.IO
using namespace System.Security.AccessControl
using namespace System.Security.Principal

$ErrorActionPreference = 'Stop'
try {
  $path = [Environment]::GetEnvironmentVariable('PAYMOS_PRIVATE_STATE_PATH')
  $action = [Environment]::GetEnvironmentVariable('PAYMOS_PRIVATE_STATE_ACTION')
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

  function Write-StagedPrivateFile([string] $directory) {
    $staged = [Path]::Combine($directory, '.paymos-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    $file = [FileStream]::new($staged, [FileMode]::CreateNew, $rights,
      [FileShare]::None, 4096, [FileOptions]::None, (New-PrivateAcl $false))
    try {
      Assert-PrivateAcl ($file.GetAccessControl()) ([AceFlags]::None)
      [Console]::OpenStandardInput().CopyTo($file)
      $file.Flush($true)
    } finally { $file.Dispose() }
    return $staged
  }

  switch ($action) {
    'ensure-dir' {
      Assert-OrdinaryPath ([Path]::GetDirectoryName($path)) $true
      [void][Directory]::CreateDirectory($path, (New-PrivateAcl $true))
      Assert-PrivateDirectory $path
    }
    'write-file' {
      $directory = [Path]::GetDirectoryName($path)
      Assert-OrdinaryPath ([Path]::GetDirectoryName($directory)) $true
      [void][Directory]::CreateDirectory($directory, (New-PrivateAcl $true))
      Assert-PrivateDirectory $directory
      $staged = Write-StagedPrivateFile $directory
      try {
        # Same-directory move keeps the protected ACL and refuses to replace an existing file.
        [File]::Move($staged, $path)
      } catch {
        if ([File]::Exists($staged)) { [File]::Delete($staged) }
        throw
      }
    }
    'replace-file' {
      $directory = [Path]::GetDirectoryName($path)
      Assert-OrdinaryPath ([Path]::GetDirectoryName($directory)) $true
      [void][Directory]::CreateDirectory($directory, (New-PrivateAcl $true))
      Assert-PrivateDirectory $directory
      $staged = Write-StagedPrivateFile $directory
      try {
        $targetExists = $false
        try {
          $null = [File]::GetAttributes($path)
          $targetExists = $true
        } catch [FileNotFoundException] {
          $targetExists = $false
        }
        if ($targetExists) {
          Assert-OrdinaryPath $path $false
          Assert-PrivateAcl ([File]::GetAccessControl($path, $sections)) ([AceFlags]::None)
          # PowerShell 5.1 coerces $null to "" on string parameters; [NullString]::Value passes real null.
          [File]::Replace($staged, $path, [NullString]::Value)
          Assert-PrivateAcl ([File]::GetAccessControl($path, $sections)) ([AceFlags]::None)
        } else {
          [File]::Move($staged, $path)
        }
      } catch {
        if ([File]::Exists($staged)) { [File]::Delete($staged) }
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

export type WindowsStateAction = "write-file" | "replace-file" | "check-file" | "ensure-dir";
export type PrivateWriteMode = "write-file" | "replace-file";

export const ASYNC_LOCK_RETRY_MS = 50;
export const ASYNC_LOCK_TIMEOUT_MS = 15_000;
export const ASYNC_LOCK_STALE_MS = 30_000;

export class PrivateStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateStateError";
  }
}

export function pathStat(path: string): BigIntStats | undefined {
  return lstatSync(path, { bigint: true, throwIfNoEntry: false });
}

export function sameOpenFile(path: BigIntStats, opened: BigIntStats): boolean {
  return path.isFile() && opened.isFile() && path.ino === opened.ino && path.birthtimeNs === opened.birthtimeNs
    && (path.dev === 0n || opened.dev === 0n || path.dev === opened.dev);
}

export function samePath(left: string, right: string, platform: NodeJS.Platform = process.platform): boolean {
  return platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

export function ordinaryDirectory(path: string, platform: NodeJS.Platform = process.platform): boolean {
  try {
    return !!pathStat(path)?.isDirectory() && samePath(realpathSync(path), path, platform);
  } catch {
    return false;
  }
}

export function privateMode(stat: BigIntStats): boolean {
  return (stat.mode & 0o077n) === 0n && (process.geteuid === undefined || stat.uid === BigInt(process.geteuid()));
}

export function windowsStateAcl(action: WindowsStateAction, path: string, input?: string): void {
  const systemRoot = process.env.SystemRoot;
  if (process.platform !== "win32" || !systemRoot || !/^[A-Za-z]:[\\/]/.test(systemRoot)) {
    throw new PrivateStateError("Private Windows state protection is unavailable.");
  }
  const windows = resolve(systemRoot);
  const executable = join(windows, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (!pathStat(executable)?.isFile() || !samePath(realpathSync(executable), executable, "win32")) {
    throw new PrivateStateError("Private Windows state protection is unavailable.");
  }
  const result = spawnSync(executable, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(windowsStateScript, "utf16le").toString("base64"),
  ], {
    cwd: windows, shell: false, stdio: [input === undefined ? "ignore" : "pipe", "ignore", "ignore"],
    input, timeout: 10_000, windowsHide: true,
    env: { SystemRoot: windows, PAYMOS_PRIVATE_STATE_ACTION: action, PAYMOS_PRIVATE_STATE_PATH: path },
  });
  if (result.error || result.status !== 0) {
    throw new PrivateStateError("Private Windows state check or write failed.");
  }
}

function ensureOrdinaryAncestors(targetDir: string, platform: NodeJS.Platform): void {
  if (!isAbsolute(targetDir)) throw new PrivateStateError("Private state path must be absolute.");
  const missing: string[] = [];
  let cursor = resolve(targetDir);
  while (!pathStat(cursor)) {
    missing.push(cursor);
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  if (!ordinaryDirectory(cursor, platform)) {
    throw new PrivateStateError("Private state ancestor directory is not an ordinary directory.");
  }
  for (let i = missing.length - 1; i >= 0; i--) {
    const segment = missing[i]!;
    try {
      mkdirSync(segment, { mode: 0o700 });
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new PrivateStateError("Could not create private state ancestor directory.");
      }
    }
    if (!ordinaryDirectory(segment, platform)) {
      throw new PrivateStateError("Private state ancestor directory is not an ordinary directory.");
    }
  }
}

export function ensurePrivateDirectory(directory: string, platform: NodeJS.Platform = process.platform): void {
  const resolved = resolve(directory);
  const parent = dirname(resolved);
  if (parent !== resolved) ensureOrdinaryAncestors(parent, platform);
  if (platform === "win32") {
    windowsStateAcl("ensure-dir", resolved);
    return;
  }
  let stat = pathStat(resolved);
  if (!stat) {
    try {
      mkdirSync(resolved, { mode: 0o700 });
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new PrivateStateError("Could not create private state directory.");
      }
    }
    stat = pathStat(resolved);
  }
  if (!stat?.isDirectory() || !ordinaryDirectory(resolved, platform) || !privateMode(stat)) {
    throw new PrivateStateError("Private state directory permissions are unsafe.");
  }
}

export function writePrivateFile(
  path: string,
  content: string,
  mode: PrivateWriteMode,
  platform: NodeJS.Platform = process.platform,
): void {
  const resolved = resolve(path);
  const directory = dirname(resolved);
  if (platform === "win32") {
    ensureOrdinaryAncestors(dirname(directory), platform);
    windowsStateAcl(mode, resolved, content);
    return;
  }
  ensurePrivateDirectory(directory, platform);
  const existing = pathStat(resolved);
  if (mode === "write-file") {
    if (existing) throw new PrivateStateError("Private state file already exists.");
  } else if (existing) {
    if (existing.isSymbolicLink() || !existing.isFile() || existing.nlink !== 1n || !privateMode(existing)) {
      throw new PrivateStateError("Existing private state file is unsafe to replace.");
    }
  }
  const staged = join(directory, `.paymos-${randomUUID()}.tmp`);
  let stagedCreated = false;
  try {
    writeFileSync(staged, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
    stagedCreated = true;
    chmodSync(staged, 0o600);
    if (mode === "write-file" || existing === undefined) {
      linkSync(staged, resolved);
    } else {
      const current = pathStat(resolved);
      if (!current || current.isSymbolicLink() || !current.isFile() || current.nlink !== 1n || !privateMode(current)) {
        throw new PrivateStateError("Existing private state file changed unsafely before replacement.");
      }
      renameSync(staged, resolved);
    }
  } catch (cause) {
    if (cause instanceof PrivateStateError) throw cause;
    throw new PrivateStateError("Could not write private state file.");
  } finally {
    if (stagedCreated && existsSync(staged)) {
      try { unlinkSync(staged); } catch { /* Ignore cleanup failure on missing staged file. */ }
    }
  }
}

export function readPrivateFile(
  path: string,
  maxBytes = 262_144,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  const resolved = resolve(path);
  const link = pathStat(resolved);
  if (!link) return undefined;
  if (link.isSymbolicLink() || !link.isFile() || link.nlink !== 1n || link.size > BigInt(maxBytes)) {
    throw new PrivateStateError("Private state file is unsafe.");
  }
  const directory = dirname(resolved);
  const dirStat = pathStat(directory);
  if (!dirStat?.isDirectory() || !ordinaryDirectory(directory, platform)) {
    throw new PrivateStateError("Private state directory is unsafe.");
  }
  if (platform === "win32") {
    windowsStateAcl("check-file", resolved);
  } else if (!privateMode(dirStat) || !privateMode(link)) {
    throw new PrivateStateError("Private state file permissions are unsafe.");
  }
  let fd: number | undefined;
  try {
    fd = openSync(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fd, { bigint: true });
    if (!sameOpenFile(link, opened) || opened.size !== link.size || opened.size > BigInt(maxBytes)) {
      throw new PrivateStateError("Private state file changed during read.");
    }
    return readFileSync(fd, "utf8");
  } catch (cause) {
    if (cause instanceof PrivateStateError) throw cause;
    throw new PrivateStateError("Could not read private state file.");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function removeIfStale(lockPath: string, now: () => number, staleMs: number): boolean {
  try {
    const stale = lstatSync(lockPath, { bigint: true });
    if (!stale.isFile() || stale.isSymbolicLink() || now() - Number(stale.mtimeMs) <= staleMs) return false;
    const current = lstatSync(lockPath, { bigint: true });
    if (!current.isFile() || current.isSymbolicLink() || !sameOpenFile(stale, current) || stale.mtimeNs !== current.mtimeNs) {
      return false;
    }
    unlinkSync(lockPath);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code === "ENOENT";
  }
}

function releaseLock(lockPath: string, mine: BigIntStats): void {
  try {
    const stat = lstatSync(lockPath, { bigint: true });
    if (stat.isFile() && !stat.isSymbolicLink() && sameOpenFile(stat, mine)) unlinkSync(lockPath);
  } catch { /* Already removed or replaced after stale takeover. */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise(accept => setTimeout(accept, ms));
}

export interface AsyncLockOptions {
  readonly platform?: NodeJS.Platform;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
  readonly staleMs?: number;
  readonly now?: () => number;
}

export async function withAsyncFileLock<T>(
  targetPath: string,
  fn: () => Promise<T> | T,
  options: AsyncLockOptions = {},
): Promise<T> {
  const platform = options.platform ?? process.platform;
  const retryDelayMs = options.retryDelayMs ?? ASYNC_LOCK_RETRY_MS;
  const timeoutMs = options.timeoutMs ?? ASYNC_LOCK_TIMEOUT_MS;
  const staleMs = options.staleMs ?? ASYNC_LOCK_STALE_MS;
  const now = options.now ?? Date.now;
  const lockPath = resolve(targetPath) + ".lock";
  ensurePrivateDirectory(dirname(lockPath), platform);

  const deadline = Date.now() + timeoutMs;
  let mine: BigIntStats;
  while (true) {
    let fd: number;
    try {
      fd = openSync(lockPath, "wx", 0o600);
    } catch (cause) {
      const code = (cause as NodeJS.ErrnoException).code;
      const busyOnWin = platform === "win32" && code === "EPERM" && Boolean(pathStat(lockPath));
      if (code !== "EEXIST" && !busyOnWin) {
        throw new PrivateStateError("Could not acquire private state lock.");
      }
      if (removeIfStale(lockPath, now, staleMs)) continue;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new PrivateStateError("Timed out waiting for private state lock.");
      }
      await sleep(Math.min(retryDelayMs, remaining));
      continue;
    }
    try {
      const opened = fstatSync(fd, { bigint: true });
      const stat = lstatSync(lockPath, { bigint: true });
      if (!sameOpenFile(stat, opened)) {
        throw new PrivateStateError("Private state lock identity mismatch.");
      }
      mine = stat;
    } finally {
      closeSync(fd);
    }
    break;
  }

  try {
    return await fn();
  } finally {
    releaseLock(lockPath, mine);
  }
}
