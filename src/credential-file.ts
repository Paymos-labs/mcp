import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync } from "node:fs";
import type { PaymosMcpCredentials } from "./config.js";
import { SETUP_COPY } from "./setup-copy.js";

/** Local credential storage. Error text deliberately never includes file content. */
export function readCredentialFile(path: string): PaymosMcpCredentials {
  let fd: number | undefined;
  try {
    const link = lstatSync(path);
    if (!link.isFile() || link.isSymbolicLink()) throw new Error();
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 16_384 || stat.ino !== link.ino) throw new Error();
    if (process.platform !== "win32" && ((stat.mode & 0o077) !== 0
      || (process.getuid !== undefined && stat.uid !== process.getuid()))) throw new Error();
    const value: unknown = JSON.parse(readFileSync(fd, "utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
    const record = value as Record<string, unknown>;
    if (typeof record.apiKeyId !== "string" || typeof record.apiSecret !== "string"
      || (record.webhookSecret !== undefined && typeof record.webhookSecret !== "string")) throw new Error();
    return {
      apiKeyId: record.apiKeyId.trim(),
      apiSecret: record.apiSecret.trim(),
      ...(typeof record.webhookSecret === "string" && record.webhookSecret.trim() !== ""
        ? { webhookSecret: record.webhookSecret.trim() } : {}),
    };
  } catch {
    throw new Error(SETUP_COPY.errors.credentialFile);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
