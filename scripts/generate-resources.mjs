/**
 * Generates src/generated/resources.ts — the five static MCP doc resources —
 * from the public docs manifest compiled by Paymos.Docs. Deterministic: same
 * manifest in, same file out. A missing source page or an empty page fails the
 * build (exit 1) so the package can never ship stale doc text silently.
 *
 * In the paymos-labs mirror the docs corpus does not exist; there the committed
 * generated file is the artifact and this script keeps it (exit 0) instead of
 * failing. Strict mode always applies inside the monorepo or wherever
 * PAYMOS_DOCS_MANIFEST points.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const defaultManifest = resolve(
  repoRoot,
  "src",
  "Frontend",
  "Paymos.Docs",
  "generated",
  "public",
  "docs-manifest.json",
);
const manifestPath = process.env.PAYMOS_DOCS_MANIFEST ?? defaultManifest;
const outFile = process.env.PAYMOS_RESOURCES_OUT ?? resolve(here, "..", "src", "generated", "resources.ts");

const RESOURCES = [
  {
    name: "quick-start",
    slug: "quick-start",
    uri: "paymos://docs/quick-start",
    description: "Paymos quick start: create a test key pair, issue the first invoice, take the first payment.",
  },
  {
    name: "hosted-checkout",
    slug: "hosted-checkout",
    uri: "paymos://docs/hosted-checkout",
    description: "Hosted checkout: the payment_url flow, invoice lifecycle and redirect handling.",
  },
  {
    name: "webhooks",
    slug: "webhooks",
    uri: "paymos://docs/webhooks",
    description: "Webhooks: event types, payloads, retries and signature verification.",
  },
  {
    name: "testing-sandbox",
    slug: "testing",
    uri: "paymos://docs/testing-sandbox",
    description: "Testing in the sandbox: simulate payments, test key pairs, the go-live checklist.",
  },
  {
    name: "server-sdks",
    slug: "server-sdks",
    uri: "paymos://docs/server-sdks",
    description: "Server SDKs: pick the SDK for your stack.",
  },
];

function fail(message) {
  console.error(`[generate-resources] ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  if (process.env.PAYMOS_DOCS_MANIFEST === undefined && !existsSync(manifestPath)) {
    // Outside the monorepo (paymos-labs mirror): the committed generated file is
    // the release artifact. Keep it; regeneration happens in the monorepo.
    const committed = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
    if (committed.includes("DOC_RESOURCES")) {
      console.log(`[generate-resources] docs manifest absent (${manifestPath}); keeping committed resources`);
      process.exit(0);
    }
    fail(`docs manifest not found and no committed resources exist at ${outFile}: ${error.message}`);
  }
  fail(`cannot read docs manifest at ${manifestPath}: ${error.message}`);
}

const entries = [];
for (const resource of RESOURCES) {
  const page = (manifest.pages ?? []).find((candidate) => candidate.slug === resource.slug && candidate.lang === "en");
  if (page === undefined) {
    fail(
      `docs page "${resource.slug}" (lang=en) not found in the manifest — a resource source page ` +
        "disappeared; refusing to emit stale resources.",
    );
  }
  const text = typeof page.htmlContent === "string" ? page.htmlContent.trim() : "";
  if (text === "") {
    fail(`docs page "${resource.slug}" (lang=en) has empty htmlContent.`);
  }
  entries.push({ ...resource, mimeType: "text/html", text: page.htmlContent });
}

const body = JSON.stringify(entries, null, 2);
const source = `// GENERATED FILE — do not edit by hand. Regenerate with: npm run build:resources
// Source: Paymos.Docs public docs-manifest.json (lang=en). Removing a source
// page breaks the build on purpose (see scripts/generate-resources.mjs).

export interface DocResource {
  readonly name: string;
  readonly slug: string;
  readonly uri: string;
  readonly description: string;
  readonly mimeType: string;
  readonly text: string;
}

export const DOC_RESOURCES: readonly DocResource[] = ${body};
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, source, "utf8");
console.log(`[generate-resources] wrote ${entries.length} doc resources from ${manifestPath}`);
