import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { connect, TEST_KEY_ID, TEST_SECRET } from "./helpers.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const script = join(here, "..", "scripts", "generate-resources.mjs");
const emittedFile = join(here, "..", "src", "generated", "resources.ts");

const RESOURCE_URIS = [
  "paymos://docs/hosted-checkout",
  "paymos://docs/quick-start",
  "paymos://docs/server-sdks",
  "paymos://docs/testing-sandbox",
  "paymos://docs/webhooks",
];

describe("doc resources", () => {
  it("serves exactly the five v1 resources", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listResources();
    expect(listed.resources.map((resource) => resource.uri).sort()).toEqual(RESOURCE_URIS);
  });

  it("returns non-empty page content for each resource", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    for (const uri of RESOURCE_URIS) {
      const read = await client.readResource({ uri });
      const first = read.contents[0] as { text?: string; mimeType?: string } | undefined;
      const text = first?.text ?? "";
      expect(text.length).toBeGreaterThan(500);
      expect(first?.mimeType).toBe("text/html");
    }
  });
});

describe("resource generation guards (task 4.1)", () => {
  function runGenerator(env: Record<string, string>) {
    return spawnSync(process.execPath, [script], {
      env: { ...process.env, ...env },
      encoding: "utf8",
    });
  }

  it("fails the build when a source page disappears from the manifest", () => {
    const manifestPath = join(mkdtempSync(join(tmpdir(), "paymos-mcp-resources-")), "docs-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 2,
        surface: "public",
        pages: [{ slug: "overview", lang: "en", htmlContent: "<p>only page</p>" }],
      }),
    );
    const result = runGenerator({ PAYMOS_DOCS_MANIFEST: manifestPath });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('"quick-start"');
  });

  it("fails the build when a source page is empty", () => {
    const manifestPath = join(mkdtempSync(join(tmpdir(), "paymos-mcp-resources-")), "docs-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 2,
        surface: "public",
        pages: [{ slug: "quick-start", lang: "en", htmlContent: "  " }],
      }),
    );
    const result = runGenerator({ PAYMOS_DOCS_MANIFEST: manifestPath });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("empty");
  });

  it("emits all five resources from a valid manifest into an isolated output", () => {
    const manifestPath = join(mkdtempSync(join(tmpdir(), "paymos-mcp-resources-")), "docs-manifest.json");
    const pages = ["quick-start", "hosted-checkout", "webhooks", "testing", "server-sdks"].map((slug) => ({
      slug,
      lang: "en",
      htmlContent: `<p>${slug} page</p>`,
    }));
    writeFileSync(manifestPath, JSON.stringify({ version: 2, surface: "public", pages }));
    // The generator writes test fixtures through PAYMOS_RESOURCES_OUT into a temp
    // file: outside the monorepo the corpus manifest does not exist, so a "restore"
    // step would be an offline no-op and leave fixture text in the committed file.
    const isolatedOutput = join(mkdtempSync(join(tmpdir(), "paymos-mcp-emitted-")), "resources.ts");
    const result = runGenerator({ PAYMOS_DOCS_MANIFEST: manifestPath, PAYMOS_RESOURCES_OUT: isolatedOutput });
    expect(result.status).toBe(0);
    const emitted = readFileSync(isolatedOutput, "utf8");
    expect(emitted.match(/"uri": "paymos:\/\//g)?.length).toBe(5);
    expect(emitted).toContain("<p>quick-start page</p>");
  });
});
