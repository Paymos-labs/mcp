import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReadableStream } from "node:stream/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDownloadFile, runUploadFile } from "../src/files.js";
import type { DeliveryRuntime } from "../src/install-secret.js";

const merchant = "11111111-1111-4111-8111-111111111111";
const operation = "22222222-2222-4222-8222-222222222222";
const endpoint = "https://app.paymos.io/connect/merchant-mcp/files/";
const uploadTicket = "ftk_" + Buffer.alloc(48, 5).toString("base64url");
const downloadTicket = "ftk_" + Buffer.alloc(32, 6).toString("base64url");
const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const roots: string[] = [];

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "paymos-files-")));
  roots.push(root);
  const home = join(root, "user");
  const cwd = join(root, "workspace");
  const base = process.platform === "win32" ? join(home, "AppData", "Local") : home;
  mkdirSync(base, { recursive: true, mode: 0o700 });
  mkdirSync(cwd);
  const stdout: string[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>();
  const runtime: DeliveryRuntime = { cwd, home, platform: process.platform, now: Date.now, stdout: line => stdout.push(line), fetch };
  return { root, cwd, runtime, fetch, stdout, stateDir: join(base, ".paymos-mcp-delivery") };
}

type Fixture = ReturnType<typeof fixture>;
type Descriptor = { request_id: string; challenge: string; byte_length?: number; content_sha256?: string; content_type?: string };
const prepareArgs = (filename: string) => [
  "--prepare", "--file", filename, "--merchant-id", merchant, "--environment", "Production", "--operation-id", operation,
];
const redeemArgs = (ticket: string, descriptor: Descriptor, filename: string) =>
  ["--token", ticket, "--request-id", descriptor.request_id, "--file", filename];

async function prepare(f: Fixture, run: typeof runUploadFile, filename: string): Promise<Descriptor> {
  await run(prepareArgs(filename), f.runtime);
  return JSON.parse(f.stdout.at(-1)!) as Descriptor;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("paymos upload-file", () => {
  it("publishes the exact image descriptor and posts the same bytes once with proof headers", async () => {
    const f = fixture();
    writeFileSync(join(f.cwd, "image.png"), image);
    const descriptor = await prepare(f, runUploadFile, "image.png");
    expect(descriptor).toEqual({
      request_id: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      challenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      byte_length: image.length, content_sha256: createHash("sha256").update(image).digest("hex"),
      content_type: "image/png",
    });
    const { verifier } = JSON.parse(readFileSync(join(f.stateDir, descriptor.request_id + ".json"), "utf8"));
    expect(f.stdout[0]).not.toContain(verifier);
    f.fetch.mockImplementationOnce(async (url, init) => {
      expect(url).toBe(endpoint + uploadTicket);
      expect(init).toMatchObject({ method: "POST", credentials: "omit", redirect: "error" });
      const headers = new Headers(init?.headers);
      expect(headers.get("Paymos-Delivery-Request")).toBe(descriptor.request_id);
      expect(headers.get("Paymos-Delivery-Verifier")).toBe(verifier);
      expect(headers.get("Content-Type")).toBe("image/png");
      expect(headers.has("Authorization")).toBe(false);
      expect(headers.has("Cookie")).toBe(false);
      expect(init?.body).toEqual(image);
      return new Response(null, { status: 204 });
    });
    const args = redeemArgs(uploadTicket, descriptor, "image.png");
    await runUploadFile(args, f.runtime);
    expect(f.stdout.at(-1)).toBe('{"status":"staged"}');
    expect(f.stdout.join("\n")).not.toContain(uploadTicket);
    await expect(runUploadFile(args, f.runtime)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not send an edited same-length file or a differently bound path", async () => {
    const f = fixture();
    const file = join(f.cwd, "image.png");
    writeFileSync(file, image);
    writeFileSync(join(f.cwd, "other.png"), image);
    const descriptor = await prepare(f, runUploadFile, "image.png");
    await expect(runUploadFile(redeemArgs(uploadTicket, descriptor, "other.png"), f.runtime))
      .rejects.toThrow(/^delivery_context_mismatch:/);
    const changed = Buffer.from(image);
    changed[8] = 99;
    writeFileSync(file, changed);
    await expect(runUploadFile(redeemArgs(uploadTicket, descriptor, "image.png"), f.runtime))
      .rejects.toThrow(/^delivery_context_mismatch:/);
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it("checks the 2 MiB upload limit before preparing state or making a request", async () => {
    const f = fixture();
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1);
    image.copy(oversized);
    writeFileSync(join(f.cwd, "large.png"), oversized);
    await expect(runUploadFile(prepareArgs("large.png"), f.runtime)).rejects.toThrow(/^delivery_file_too_large:/);
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.stdout).toHaveLength(0);
    expect(existsSync(f.stateDir)).toBe(false);
  });

  it("refuses the download ticket format or a proof prepared for the other direction", async () => {
    const f = fixture();
    const descriptor = await prepare(f, runDownloadFile, "image.png");
    writeFileSync(join(f.cwd, "image.png"), image);
    await expect(runUploadFile(redeemArgs(downloadTicket, descriptor, "image.png"), f.runtime))
      .rejects.toThrow(/^delivery_arguments:/);
    await expect(runUploadFile(redeemArgs(uploadTicket, descriptor, "image.png"), f.runtime))
      .rejects.toThrow(/^delivery_context_mismatch:/);
    expect(f.fetch).not.toHaveBeenCalled();
  });
});

describe("paymos download-file", () => {
  it("streams a native CSV larger than 2 MiB to the prepared destination without using the server filename", async () => {
    const f = fixture();
    const filename = "report.csv";
    const descriptor = await prepare(f, runDownloadFile, filename);
    expect(Object.keys(descriptor).sort()).toEqual(["challenge", "request_id"]);
    const fixtureRows = Buffer.alloc(1024 * 1024 + 1, 65);
    let i = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i++ < 2) controller.enqueue(fixtureRows);
        else controller.close();
      },
    });
    f.fetch.mockImplementationOnce(async (url, init) => {
      expect(url).toBe(endpoint + downloadTicket);
      expect(init).toMatchObject({ method: "GET", credentials: "omit", redirect: "error" });
      expect(init?.body).toBeUndefined();
      const headers = new Headers(init?.headers);
      expect(headers.get("Paymos-Delivery-Request")).toBe(descriptor.request_id);
      expect(headers.get("Paymos-Delivery-Verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/);
      return new Response(stream, { headers: {
        "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": 'attachment; filename="../../escape.csv"',
      } });
    });
    await runDownloadFile(redeemArgs(downloadTicket, descriptor, filename), f.runtime);
    expect(readFileSync(join(f.cwd, filename)).equals(Buffer.concat([fixtureRows, fixtureRows]))).toBe(true);
    expect(readdirSync(f.cwd)).toEqual([filename]);
    expect(existsSync(join(f.root, "escape.csv"))).toBe(false);
    expect(JSON.parse(f.stdout.at(-1)!)).toEqual({ status: "downloaded", byte_length: fixtureRows.length * 2 });
  });

  it("refuses linked paths and prevents a concurrent file from being overwritten", async () => {
    const f = fixture();
    const outside = join(f.root, "outside");
    mkdirSync(outside);
    symlinkSync(outside, join(f.cwd, "link"), process.platform === "win32" ? "junction" : "dir");
    await expect(runDownloadFile(prepareArgs("link/out.csv"), f.runtime)).rejects.toThrow(/^delivery_unsafe_path:/);
    const descriptor = await prepare(f, runDownloadFile, "report.csv");
    f.fetch.mockImplementationOnce(async () => {
      writeFileSync(join(f.cwd, "report.csv"), "concurrent writer");
      return new Response("a,b", { headers: { "Content-Type": "text/csv" } });
    });
    await expect(runDownloadFile(redeemArgs(downloadTicket, descriptor, "report.csv"), f.runtime))
      .rejects.toThrow(/^delivery_unsafe_path:/);
    expect(readFileSync(join(f.cwd, "report.csv"), "utf8")).toBe("concurrent writer");
    expect(readdirSync(f.cwd).sort()).toEqual(["link", "report.csv"]);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("discards truncated or interrupted transfers and does not reuse the local session", async () => {
    const f = fixture();
    const filename = "report.csv";
    const first = await prepare(f, runDownloadFile, filename);
    f.fetch.mockResolvedValueOnce(new Response("short", {
      headers: { "Content-Type": "text/csv", "Content-Length": "22" },
    }));
    await expect(runDownloadFile(redeemArgs(downloadTicket, first, filename), f.runtime))
      .rejects.toThrow(/^delivery_invalid_response:/);
    const second = await prepare(f, runDownloadFile, filename);
    let sent = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!sent) { controller.enqueue(Buffer.from("partial")); sent = true; }
        else controller.error(new Error("private fixture"));
      },
    });
    f.fetch.mockResolvedValueOnce(new Response(stream, { headers: { "Content-Type": "text/csv" } }));
    const args = redeemArgs(downloadTicket, second, filename);
    await expect(runDownloadFile(args, f.runtime)).rejects.toThrow(/^delivery_request_failed:/);
    await expect(runDownloadFile(args, f.runtime)).rejects.toThrow(/^delivery_state_unavailable:/);
    expect(readdirSync(f.cwd)).toEqual([]);
    expect(f.stdout).toHaveLength(2);
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retain a download temporary file when the original grant is unavailable", async () => {
    const f = fixture();
    const descriptor = await prepare(f, runDownloadFile, "report.csv");
    f.fetch.mockResolvedValueOnce(new Response("server fixture", { status: 404 }));
    await expect(runDownloadFile(redeemArgs(downloadTicket, descriptor, "report.csv"), f.runtime))
      .rejects.toThrow(/^delivery_unavailable:/);
    expect(readdirSync(f.cwd)).toEqual([]);
  });
});
