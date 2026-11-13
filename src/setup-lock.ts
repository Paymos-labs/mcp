import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Serializes the "compare with the planned snapshot, then publish" step of setup between
 * setup processes that write the same client configuration.
 *
 * Publication replaces an existing file with rename(2). The comparison that precedes it and
 * the rename are two system calls, so two setups that planned from the same file could both
 * pass the comparison and the later rename would discard the earlier one's entry. With the
 * lock held, the second setup either finds the lock and refuses, or enters after the first
 * one released it and then fails the comparison because the file is no longer the one it
 * planned from.
 *
 * Scope: this is an advisory lock that only setup takes. A writer that does not take it — the
 * MCP client saving its own settings, an editor — is not excluded by it.
 */

/** Suffix of the lock file created next to the destination for the duration of publication. */
export const LOCK_SUFFIX = ".paymos-setup.lock";

/**
 * Age after which a lock file is treated as left behind by a setup that did not exit normally.
 * The lock is held for a comparison and at most two file publications (milliseconds), with no
 * prompt and no network call inside, so 30 seconds cannot be a live holder.
 */
export const STALE_LOCK_MS = 30_000;

/** Another setup holds the lock for this destination. */
export class DestinationBusyError extends Error {
  constructor() {
    super("Another setup is publishing to this destination.");
    this.name = "DestinationBusyError";
  }
}

type Identity = { ino: number; dev: number };

function acquire(lock: string, now: () => number): Identity {
  for (let attempt = 0; ; attempt++) {
    let fd: number;
    try {
      // O_CREAT | O_EXCL: fails on any existing entry, a symbolic link included.
      fd = openSync(lock, "wx", 0o600);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
      if (attempt > 0 || !removeIfStale(lock, now)) throw new DestinationBusyError();
      continue;
    }
    try {
      const stat = fstatSync(fd);
      return { ino: stat.ino, dev: stat.dev };
    } finally {
      closeSync(fd);
    }
  }
}

/** True when the entry is gone afterwards, so one more exclusive create may be attempted. */
function removeIfStale(lock: string, now: () => number): boolean {
  try {
    if (now() - lstatSync(lock).mtimeMs < STALE_LOCK_MS) return false;
    unlinkSync(lock);
    return true;
  } catch (cause) {
    // Released between the failed create and this check: free to retry. Anything else
    // (the holder still has it open on Windows, no permission) is a live or foreign lock.
    return (cause as NodeJS.ErrnoException).code === "ENOENT";
  }
}

/** Removes the lock only while it is still the file this call created. */
function release(lock: string, mine: Identity): void {
  try {
    const stat = lstatSync(lock);
    if (stat.ino === mine.ino && stat.dev === mine.dev) unlinkSync(lock);
  } catch { /* Already removed, or replaced by another holder after a stale takeover. */ }
}

/**
 * Runs `action` while holding the lock for `destination`.
 * Throws `DestinationBusyError` without running it when another setup holds the lock.
 */
export function withDestinationLock<T>(
  destination: string, action: () => T, now: () => number = Date.now,
): T {
  const lock = destination + LOCK_SUFFIX;
  mkdirSync(dirname(lock), { recursive: true, mode: 0o700 });
  const mine = acquire(lock, now);
  try {
    return action();
  } finally {
    release(lock, mine);
  }
}
