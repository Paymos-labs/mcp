import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { CONNECT_DOC_RESOURCES, DOC_RESOURCES } from "../src/generated/resources.js";
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
      if (uri === "paymos://docs/quick-start") {
        expect(text).toContain('data-code-lang="mcp"');
        expect(text).toContain("npx -y @paymos/mcp setup");
        expect(text).toContain("create_invoice");
        expect(text).toContain("verify_webhook_signature");
      } else {
        expect(text).not.toContain('data-code-lang="mcp"');
      }
    }
  });
});

const CONNECT_SLUGS = [
  "overview",
  "quick-start",
  "payment-flow",
  "hosted-checkout",
  "supported-currencies",
  "widget-sdk",
  "widget-terminal",
  "server-sdks",
  "api-keys",
  "webhooks",
  "webhooks/verify",
  "testing",
  "payment-channels/create",
  "payment-channel-deposits/list",
  "errors",
  "cms-woocommerce",
  "cms-whmcs",
  "cms-prestashop",
  "cms-magento2",
  "cms-opencart",
  "cms-shopware6",
  "cms-cscart",
  "cms-easy-digital-downloads",
  "cms-drupal-commerce",
  "cms-hikashop",
  "cms-givewp",
  "cms-odoo",
  "cms-blesta",
  "cms-fossbilling",
  "cms-paymenter",
] as const;

const EXPECTED_CONNECT_URIS = [
  "paymos://docs/api-keys",
  "paymos://docs/cms-blesta",
  "paymos://docs/cms-cscart",
  "paymos://docs/cms-drupal-commerce",
  "paymos://docs/cms-easy-digital-downloads",
  "paymos://docs/cms-fossbilling",
  "paymos://docs/cms-givewp",
  "paymos://docs/cms-hikashop",
  "paymos://docs/cms-magento2",
  "paymos://docs/cms-odoo",
  "paymos://docs/cms-opencart",
  "paymos://docs/cms-paymenter",
  "paymos://docs/cms-prestashop",
  "paymos://docs/cms-shopware6",
  "paymos://docs/cms-whmcs",
  "paymos://docs/cms-woocommerce",
  "paymos://docs/errors",
  "paymos://docs/hosted-checkout",
  "paymos://docs/overview",
  "paymos://docs/payment-channel-deposits-list",
  "paymos://docs/payment-channels-create",
  "paymos://docs/payment-flow",
  "paymos://docs/quick-start",
  "paymos://docs/server-sdks",
  "paymos://docs/supported-currencies",
  "paymos://docs/testing-sandbox",
  "paymos://docs/webhooks",
  "paymos://docs/webhooks-verify",
  "paymos://docs/widget-sdk",
  "paymos://docs/widget-terminal",
];

const tempRoots: string[] = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("connect doc resources", () => {
  it("preserves exact 5 v1 DOC_RESOURCES and emits 30 unique CONNECT_DOC_RESOURCES", () => {
    expect(DOC_RESOURCES).toHaveLength(5);
    expect(DOC_RESOURCES.map((resource) => resource.uri).sort()).toEqual(RESOURCE_URIS);

    expect(CONNECT_DOC_RESOURCES).toHaveLength(30);
    const uris = CONNECT_DOC_RESOURCES.map((resource) => resource.uri);
    expect(new Set(uris).size).toBe(30);
    expect([...uris].sort()).toEqual(EXPECTED_CONNECT_URIS);
    for (const resource of CONNECT_DOC_RESOURCES) {
      expect(resource.mimeType).toBe("text/html");
      expect(resource.text.trim().length).toBeGreaterThan(200);
    }
  });
});

describe("resource generation guards (task 4.1)", () => {
  function runGenerator(env: Record<string, string>, scriptPath = script) {
    return spawnSync(process.execPath, [scriptPath], {
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

  it("fails the build when a connect source page disappears from the manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "paymos-mcp-resources-"));
    tempRoots.push(dir);
    const manifestPath = join(dir, "docs-manifest.json");
    const pages = CONNECT_SLUGS.filter((slug) => slug !== "cms-odoo").map((slug) => ({
      slug,
      lang: "en",
      htmlContent: `<p>${slug} page</p>`,
    }));
    writeFileSync(manifestPath, JSON.stringify({ version: 2, surface: "public", pages }));
    const result = runGenerator({ PAYMOS_DOCS_MANIFEST: manifestPath });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('"cms-odoo"');
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

  it("emits all five v1 and 30 connect resources from a valid manifest into an isolated output", () => {
    const manifestPath = join(mkdtempSync(join(tmpdir(), "paymos-mcp-resources-")), "docs-manifest.json");
    const pages = CONNECT_SLUGS.map((slug) => ({
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
    expect(emitted.match(/"uri": "paymos:\/\//g)?.length).toBe(35);
    expect(emitted).toContain("<p>quick-start page</p>");
    expect(emitted).toContain("<p>cms-odoo page</p>");
    expect(emitted).toContain("paymos://docs/payment-channel-deposits-list");
  });

  it("keeps committed resources in mirror fallback only when both DOC_RESOURCES and CONNECT_DOC_RESOURCES exist", () => {
    const mirrorRoot = mkdtempSync(join(tmpdir(), "paymos-mcp-mirror-"));
    tempRoots.push(mirrorRoot);
    const mirrorScript = join(mirrorRoot, "plugins", "mcp", "scripts", "generate-resources.mjs");
    const mirrorOut = join(mirrorRoot, "plugins", "mcp", "src", "generated", "resources.ts");
    mkdirSync(join(mirrorRoot, "plugins", "mcp", "scripts"), { recursive: true });
    mkdirSync(join(mirrorRoot, "plugins", "mcp", "src", "generated"), { recursive: true });
    copyFileSync(script, mirrorScript);
    copyFileSync(emittedFile, mirrorOut);

    const envWithoutManifest: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined && k !== "PAYMOS_DOCS_MANIFEST" && k !== "PAYMOS_RESOURCES_OUT") {
        envWithoutManifest[k] = v;
      }
    }
    const ok = spawnSync(process.execPath, [mirrorScript], { env: envWithoutManifest, encoding: "utf8" });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("keeping committed resources");

    writeFileSync(mirrorOut, "export const DOC_RESOURCES = [];\n", "utf8");
    const stale = spawnSync(process.execPath, [mirrorScript], { env: envWithoutManifest, encoding: "utf8" });
    expect(stale.status).not.toBe(0);
  });
});
