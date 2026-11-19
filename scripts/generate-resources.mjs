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

const CONNECT_RESOURCES = [
  {
    name: "overview",
    slug: "overview",
    uri: "paymos://docs/overview",
    description: "Paymos overview: Merchant API, hosted checkout, payment channels, balances, webhooks, and payouts.",
  },
  ...RESOURCES.slice(0, 1),
  {
    name: "payment-flow",
    slug: "payment-flow",
    uri: "paymos://docs/payment-flow",
    description: "Payment flow: invoice lifecycle from creation through confirmation, expiry, and webhooks.",
  },
  ...RESOURCES.slice(1, 2),
  {
    name: "supported-currencies",
    slug: "supported-currencies",
    uri: "paymos://docs/supported-currencies",
    description: "Supported currencies and networks: 4 stablecoins plus gold-backed XAUT across 13 deposit networks (11 for payouts).",
  },
  {
    name: "widget-sdk",
    slug: "widget-sdk",
    uri: "paymos://docs/widget-sdk",
    description: "Low-Code JavaScript SDK (/v1/paymos-widget.js): PaymosWidget.mount() pay button and iframe/redirect checkout.",
  },
  {
    name: "widget-terminal",
    slug: "widget-terminal",
    uri: "paymos://docs/widget-terminal",
    description: "POS Terminal: browser-based in-person QR payment screen for a project.",
  },
  ...RESOURCES.slice(4, 5),
  {
    name: "api-keys",
    slug: "api-keys",
    uri: "paymos://docs/api-keys",
    description: "API keys: Payment (pk_) and Payout (rk_) keys, HMAC-SHA256 signing, Sandbox vs Production.",
  },
  ...RESOURCES.slice(2, 3),
  {
    name: "webhooks-verify",
    slug: "webhooks/verify",
    uri: "paymos://docs/webhooks-verify",
    description: "Verify webhook signatures: X-Webhook-Signature over raw body, timestamp skew, dual v1 secret rotation.",
  },
  ...RESOURCES.slice(3, 4),
  {
    name: "payment-channels-create",
    slug: "payment-channels/create",
    uri: "paymos://docs/payment-channels-create",
    description: "Create payment channel: permanent per-payer deposit addresses for repeat account top-ups.",
  },
  {
    name: "payment-channel-deposits-list",
    slug: "payment-channel-deposits/list",
    uri: "paymos://docs/payment-channel-deposits-list",
    description: "Poll confirmed channel deposits: cursor pagination, finality, and blockage diagnostics.",
  },
  {
    name: "errors",
    slug: "errors",
    uri: "paymos://docs/errors",
    description: "Error handling: Problem Details envelope, HTTP status codes, rate limits, and retries.",
  },
  {
    name: "cms-woocommerce",
    slug: "cms-woocommerce",
    uri: "paymos://docs/cms-woocommerce",
    description: "WooCommerce plugin: one-click Connect Paymos setup, checkout, and verified webhooks.",
  },
  {
    name: "cms-whmcs",
    slug: "cms-whmcs",
    uri: "paymos://docs/cms-whmcs",
    description: "WHMCS plugin: stablecoin billing for WHMCS invoices with automatic provisioning.",
  },
  {
    name: "cms-prestashop",
    slug: "cms-prestashop",
    uri: "paymos://docs/cms-prestashop",
    description: "PrestaShop plugin (1.7.8 through 9.x): module installation, connect flow, and order confirmation.",
  },
  {
    name: "cms-magento2",
    slug: "cms-magento2",
    uri: "paymos://docs/cms-magento2",
    description: "Magento 2 / Adobe Commerce module: installation, Sandbox/Live connection, and order status sync.",
  },
  {
    name: "cms-opencart",
    slug: "cms-opencart",
    uri: "paymos://docs/cms-opencart",
    description: "OpenCart extension (4.0.2.0+): installation, Connect Paymos flow, and payment verification.",
  },
  {
    name: "cms-shopware6",
    slug: "cms-shopware6",
    uri: "paymos://docs/cms-shopware6",
    description: "Shopware 6 plugin: per-sales-channel activation, signed transaction checks, and mode switching.",
  },
  {
    name: "cms-cscart",
    slug: "cms-cscart",
    uri: "paymos://docs/cms-cscart",
    description: "CS-Cart & Multi-Vendor add-on: project connection, webhook verification, and test checkout.",
  },
  {
    name: "cms-easy-digital-downloads",
    slug: "cms-easy-digital-downloads",
    uri: "paymos://docs/cms-easy-digital-downloads",
    description: "Easy Digital Downloads plugin: digital file delivery gated on verified stablecoin payment.",
  },
  {
    name: "cms-drupal-commerce",
    slug: "cms-drupal-commerce",
    uri: "paymos://docs/cms-drupal-commerce",
    description: "Drupal Commerce module (drupal/commerce_paymos): offsite gateway, cron reconciliation, and setup.",
  },
  {
    name: "cms-hikashop",
    slug: "cms-hikashop",
    uri: "paymos://docs/cms-hikashop",
    description: "HikaShop plugin for Joomla: checkout method setup, order confirmation, and refunds.",
  },
  {
    name: "cms-givewp",
    slug: "cms-givewp",
    uri: "paymos://docs/cms-givewp",
    description: "GiveWP plugin: one-time stablecoin donations on WordPress with verified receipts and refunds.",
  },
  {
    name: "cms-odoo",
    slug: "cms-odoo",
    uri: "paymos://docs/cms-odoo",
    description: "Odoo 20.0 module (payment_paymos): self-hosted checkout provider, reconciliation, and refunds.",
  },
];

function fail(message) {
  console.error(`[generate-resources] ${message}`);
  process.exit(1);
}

function compileResources(specs, pages) {
  const entries = [];
  for (const resource of specs) {
    const page = pages.find((candidate) => candidate.slug === resource.slug && candidate.lang === "en");
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
  return entries;
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  if (process.env.PAYMOS_DOCS_MANIFEST === undefined && !existsSync(manifestPath)) {
    // Outside the monorepo (paymos-labs mirror): the committed generated file is
    // the release artifact. Keep it; regeneration happens in the monorepo.
    const committed = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
    if (committed.includes("DOC_RESOURCES") && committed.includes("CONNECT_DOC_RESOURCES")) {
      console.log(`[generate-resources] docs manifest absent (${manifestPath}); keeping committed resources`);
      process.exit(0);
    }
    fail(`docs manifest not found and no committed resources exist at ${outFile}: ${error.message}`);
  }
  fail(`cannot read docs manifest at ${manifestPath}: ${error.message}`);
}

const pages = manifest.pages ?? [];
const entries = compileResources(RESOURCES, pages);
const connectEntries = compileResources(CONNECT_RESOURCES, pages);

const body = JSON.stringify(entries, null, 2);
const connectBody = JSON.stringify(connectEntries, null, 2);
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

export const CONNECT_DOC_RESOURCES: readonly DocResource[] = ${connectBody};
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, source, "utf8");
console.log(
  `[generate-resources] wrote ${entries.length} doc resources and ${connectEntries.length} connect doc resources from ${manifestPath}`,
);
