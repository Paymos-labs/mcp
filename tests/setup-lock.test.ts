import { existsSync, mkdtempSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DestinationBusyError, LOCK_SUFFIX, STALE_LOCK_MS, withDestinationLock } from "../src/setup-lock.js";

function destination() {
  const path = join(mkdtempSync(join(tmpdir(), "paymos-setup-lock-")), "client", "mcp.json");
  return { path, lock: path + LOCK_SUFFIX };
}

describe("setup destination lock", () => {
  it("holds the lock for the duration of the action and removes it afterwards", () => {
    const d = destination();
    const result = withDestinationLock(d.path, () => {
      expect(existsSync(d.lock)).toBe(true);
      return "published";
    });
    expect(result).toBe("published");
    expect(existsSync(d.lock)).toBe(false);
    // The destination itself is never created or opened by the lock.
    expect(existsSync(d.path)).toBe(false);
  });

  it("removes the lock when the action throws and lets the error through", () => {
    const d = destination();
    expect(() => withDestinationLock(d.path, () => { throw new Error("write denied"); })).toThrow("write denied");
    expect(existsSync(d.lock)).toBe(false);
  });

  it("refuses a second holder of the same destination without running its action", () => {
    const d = destination();
    let competingRan = false;
    withDestinationLock(d.path, () => {
      expect(() => withDestinationLock(d.path, () => { competingRan = true; })).toThrow(DestinationBusyError);
      // The refused attempt must not have released the first holder's lock.
      expect(existsSync(d.lock)).toBe(true);
    });
    expect(competingRan).toBe(false);
    expect(existsSync(d.lock)).toBe(false);
  });

  it("does not serialize different destinations in one directory", () => {
    const d = destination();
    const other = d.path.replace("mcp.json", "other.json");
    expect(withDestinationLock(d.path, () => withDestinationLock(other, () => "both"))).toBe("both");
  });

  it("leaves a live lock created by another process untouched", () => {
    const d = destination();
    withDestinationLock(d.path, () => undefined);
    writeFileSync(d.lock, "other holder");
    expect(() => withDestinationLock(d.path, () => undefined)).toThrow(DestinationBusyError);
    expect(readFileSync(d.lock, "utf8")).toBe("other holder");
  });

  it("takes over a lock older than the stale threshold", () => {
    const d = destination();
    withDestinationLock(d.path, () => undefined);
    writeFileSync(d.lock, "crashed holder");
    const created = Date.now();
    const justBelow = () => created + STALE_LOCK_MS - 5_000;
    expect(() => withDestinationLock(d.path, () => undefined, justBelow)).toThrow(DestinationBusyError);
    const past = () => created + STALE_LOCK_MS + 5_000;
    expect(withDestinationLock(d.path, () => "recovered", past)).toBe("recovered");
    expect(existsSync(d.lock)).toBe(false);
  });

  it("judges staleness by the lock file's modification time", () => {
    const d = destination();
    withDestinationLock(d.path, () => undefined);
    writeFileSync(d.lock, "crashed holder");
    const hourAgo = new Date(Date.now() - 3_600_000);
    utimesSync(d.lock, hourAgo, hourAgo);
    expect(withDestinationLock(d.path, () => "recovered")).toBe("recovered");
  });

  it("does not remove a lock that replaced its own during the action", () => {
    const d = destination();
    withDestinationLock(d.path, () => {
      // Another process judged this lock stale, removed it and created its own.
      // The first file is kept under another name so its inode cannot be reused.
      renameSync(d.lock, d.lock + ".previous");
      writeFileSync(d.lock, "next holder");
    });
    expect(readFileSync(d.lock, "utf8")).toBe("next holder");
  });

  it.skipIf(process.platform === "win32")("treats a symbolic link at the lock path as a held lock and does not follow it", () => {
    const d = destination();
    withDestinationLock(d.path, () => undefined);
    const target = d.path + ".victim";
    writeFileSync(target, "keep");
    symlinkSync(target, d.lock);
    expect(() => withDestinationLock(d.path, () => undefined)).toThrow(DestinationBusyError);
    expect(readFileSync(target, "utf8")).toBe("keep");
  });
});
