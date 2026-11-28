import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, linkSync, lstatSync, openSync, readSync, unlinkSync } from "node:fs";
import { open } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assertDeliveryTarget, checkDeliveryExpiry, claimDelivery, defaultDeliveryRuntime, deliveryArguments,
  deliveryTarget, failDelivery, prepareDelivery, redeemDelivery, responseType, safeDelivery, sameOpenFile, streamDelivery,
  type DeliveryRuntime, type DeliveryTarget, type UploadDescriptor,
} from "./install-secret.js";
import { withDestinationLock } from "./setup-lock.js";

const maxUploadBytes = 2 * 1024 * 1024;
// Native exporters can exceed the image upload limit. Stream to disk with a separate
// client-side ceiling and a request deadline to limit a broken response.
const maxDownloadBytes = 128 * 1024 * 1024;
const exportTypes = new Set([
  "text/csv", "application/zip", "application/x-zip-compressed", "application/octet-stream", "image/png", "image/svg+xml",
]);

function imageType(bytes: Buffer): string {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return failDelivery("delivery_context_mismatch");
}

function readUpload(target: DeliveryTarget): { bytes: Buffer; descriptor: UploadDescriptor } {
  const stat = assertDeliveryTarget(target);
  if (!stat || stat.size <= 0n) return failDelivery("delivery_unsafe_path");
  if (stat.size > BigInt(maxUploadBytes)) return failDelivery("delivery_file_too_large");
  const fd = openSync(target.path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(fd, { bigint: true });
    if (!sameOpenFile(stat, opened) || opened.size !== stat.size) return failDelivery("delivery_context_mismatch");
    const bytes = Buffer.alloc(Number(stat.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!count) return failDelivery("delivery_context_mismatch");
      offset += count;
    }
    const after = assertDeliveryTarget(target);
    if (readSync(fd, Buffer.alloc(1), 0, 1, null) !== 0 || !after || !sameOpenFile(after, opened)
      || after.mtimeNs !== stat.mtimeNs || after.size !== stat.size) return failDelivery("delivery_context_mismatch");
    return { bytes, descriptor: {
      byte_length: bytes.length,
      content_sha256: createHash("sha256").update(bytes).digest("hex"),
      content_type: imageType(bytes),
    } };
  } finally {
    closeSync(fd);
  }
}

export async function runUploadFile(argv: readonly string[], runtime?: DeliveryRuntime): Promise<void> {
  return safeDelivery(async () => {
    const io = runtime ?? defaultDeliveryRuntime();
    const input = deliveryArguments(argv, "upload-file", io.env);
    const target = deliveryTarget(input.file, io);
    const upload = readUpload(target);
    if (input.prepare) {
      prepareDelivery("upload-file", input.scope, target, io, upload.descriptor);
      return;
    }
    const proof = claimDelivery("upload-file", input, target, io, upload.descriptor);
    await redeemDelivery("upload-file", input, proof, io, upload);
    io.stdout(JSON.stringify({ status: "staged" }));
  });
}

export async function runDownloadFile(argv: readonly string[], runtime?: DeliveryRuntime): Promise<void> {
  return safeDelivery(async () => {
    const io = runtime ?? defaultDeliveryRuntime();
    const input = deliveryArguments(argv, "download-file", io.env);
    const target = deliveryTarget(input.file, io);
    if (assertDeliveryTarget(target)) failDelivery("delivery_unsafe_path");
    if (input.prepare) {
      prepareDelivery("download-file", input.scope, target, io);
      return;
    }
    const proof = claimDelivery("download-file", input, target, io);
    const temp = join(dirname(target.path), ".paymos-download-" + randomUUID() + ".tmp");
    const file = await open(temp, "wx", 0o600);
    let identity;
    let closed = false;
    try {
      identity = await file.stat({ bigint: true });
      if (process.platform !== "win32") await file.chmod(0o600);
      const response = await redeemDelivery("download-file", input, proof, io);
      if (!exportTypes.has(responseType(response) ?? "")) {
        void response.body?.cancel().catch(() => {});
        failDelivery("delivery_invalid_response");
      }
      const bytes = await streamDelivery(response, maxDownloadBytes, chunk => file.writeFile(chunk));
      await file.sync();
      await file.close();
      closed = true;
      withDestinationLock(target.path, () => {
        checkDeliveryExpiry(proof, io);
        if (assertDeliveryTarget(target)) failDelivery("delivery_unsafe_path");
        const staged = lstatSync(temp, { bigint: true });
        if (!sameOpenFile(staged, identity!) || staged.size !== BigInt(bytes)) failDelivery("delivery_context_mismatch");
        linkSync(temp, target.path);
      });
      io.stdout(JSON.stringify({ status: "downloaded", byte_length: bytes }));
    } finally {
      if (!closed) await file.close().catch(() => {});
      try {
        if (identity && sameOpenFile(lstatSync(temp, { bigint: true }), identity)) unlinkSync(temp);
      } catch { /* A replaced or removed temporary path is no longer ours. */ }
    }
  });
}
