import { TimestampSkewError, WebhookVerifier } from "@paymos/sdk";
import { readTokenStore } from "./oauth-session.js";

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_EXPIRY_SKEW_MS = 30_000;

export const INTEGRATION_SCENARIOS = [
  "cms_plugin",
  "checkout_widget",
  "pos_terminal",
  "order_checkout",
  "repeat_deposits",
  "both",
  "unsure",
] as const;

export type IntegrationScenario = typeof INTEGRATION_SCENARIOS[number];

export interface LocalToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations?: {
    readonly readOnlyHint?: boolean;
    readonly destructiveHint?: boolean;
    readonly openWorldHint?: boolean;
  };
}

export interface LocalConnectContext {
  readonly origin: string;
  readonly tokenFile: string;
  readonly env: Env;
  readonly platform?: NodeJS.Platform;
  readonly now?: () => number;
}

export interface LocalToolResult {
  readonly content: Array<{ readonly type: "text"; readonly text: string }>;
  readonly isError?: boolean;
}

export const CONNECT_INSTRUCTIONS = [
  "Paymos Merchant MCP works immediately in offline reference & integration-advisor mode before any browser sign-in.",
  "Always use `paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`, and `paymos://docs/*` resources (`resources/list`, `resources/read`) for Paymos architecture, CMS plugins, server SDKs, Low-Code widget, POS terminal, supported networks/assets, and webhook signature checks—these run 100% locally with zero network requests and without opening a browser.",
  "Only call account or sandbox API tools (`get_connection_status`, `merchant_*`, `playground_*`) when the merchant explicitly asks to sign in, inspect their Paymos account/projects, or execute Sandbox/Production operations, because calling those when signed out triggers browser OAuth PKCE login.",
  "When any tool returns `status: \"user_action_required\"` (whether `reason: \"login_required\"` for OAuth sign-in or a 2FA/Passkey/browser handoff confirmation), the bridge already opens the user's default browser; you MUST always print the full clickable `continue_url` in chat (so the user can copy or open it in another browser or profile if needed), wait for confirmation, and then retry the tool call (reusing the same `operation_id` when present).",
  "Respect the merchant's stated integration choice, ask clarifying questions when `scenario` is `unsure`, never call `XAUT` a stablecoin (it is gold-backed; the 4 stablecoins are USDT, USDC, USD1, DAI), note that NEAR and SUI are deposit-only (13 deposit networks, 11 withdrawal networks), and enforce raw-body `X-Webhook-Signature` verification (multi-`v1=` rotation), `confirmed` + `is_final`, `event_id` deduplication, string amounts, and Sandbox/Production isolation.",
].join(" ");

interface CmsCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly doc_uri: string;
  readonly aliases: readonly string[];
  readonly repository?: string;
}

const CMS_CATALOG: readonly CmsCatalogEntry[] = [
  {
    id: "woocommerce",
    name: "WooCommerce",
    doc_uri: "paymos://docs/cms-woocommerce",
    repository: "Paymos-labs/woocommerce",
    aliases: ["woocommerce", "woo", "woocom", "cmswoocommerce"],
  },
  {
    id: "whmcs",
    name: "WHMCS",
    doc_uri: "paymos://docs/cms-whmcs",
    repository: "Paymos-labs/whmcs",
    aliases: ["whmcs", "cmswhmcs"],
  },
  {
    id: "prestashop",
    name: "PrestaShop",
    doc_uri: "paymos://docs/cms-prestashop",
    repository: "Paymos-labs/prestashop",
    aliases: ["prestashop", "presta", "cmsprestashop"],
  },
  {
    id: "magento2",
    name: "Magento 2 / Adobe Commerce",
    doc_uri: "paymos://docs/cms-magento2",
    repository: "Paymos-labs/magento2",
    aliases: ["magento2", "magento", "adobecommerce", "cmsmagento2"],
  },
  {
    id: "opencart",
    name: "OpenCart",
    doc_uri: "paymos://docs/cms-opencart",
    repository: "Paymos-labs/opencart",
    aliases: ["opencart", "cmsopencart"],
  },
  {
    id: "shopware6",
    name: "Shopware 6",
    doc_uri: "paymos://docs/cms-shopware6",
    repository: "Paymos-labs/shopware6",
    aliases: ["shopware6", "shopware", "cmsshopware6"],
  },
  {
    id: "cscart",
    name: "CS-Cart",
    doc_uri: "paymos://docs/cms-cscart",
    repository: "Paymos-labs/cscart",
    aliases: ["cscart", "cmscscart"],
  },
  {
    id: "easy-digital-downloads",
    name: "Easy Digital Downloads",
    doc_uri: "paymos://docs/cms-easy-digital-downloads",
    repository: "Paymos-labs/edd",
    aliases: ["easydigitaldownloads", "edd", "cmseasydigitaldownloads"],
  },
  {
    id: "drupal-commerce",
    name: "Drupal Commerce",
    doc_uri: "paymos://docs/cms-drupal-commerce",
    repository: "Paymos-labs/drupal-commerce",
    aliases: ["drupalcommerce", "drupal", "commercepaymos", "cmsdrupalcommerce"],
  },
  {
    id: "hikashop",
    name: "HikaShop (Joomla)",
    doc_uri: "paymos://docs/cms-hikashop",
    repository: "Paymos-labs/hikashop",
    aliases: ["hikashop", "joomla", "cmshikashop"],
  },
  {
    id: "givewp",
    name: "GiveWP",
    doc_uri: "paymos://docs/cms-givewp",
    repository: "Paymos-labs/givewp",
    aliases: ["givewp", "cmsgivewp"],
  },
  {
    id: "odoo",
    name: "Odoo 20.0",
    doc_uri: "paymos://docs/cms-odoo",
    repository: "Paymos-labs/odoo",
    aliases: ["odoo", "odoo20", "odoo200", "paymentpaymos", "cmsodoo"],
  },
];

const SERVER_SDKS = [
  { language: "TypeScript / JavaScript", registry: "npm", package: "@paymos/sdk" },
  { language: "Python", registry: "PyPI", package: "paymos-sdk" },
  { language: "PHP", registry: "Packagist", package: "paymos/php-sdk" },
  { language: "Go", registry: "Go modules", package: "github.com/Paymos-labs/go-sdk/v2" },
  { language: ".NET", registry: "NuGet", package: "Paymos" },
  { language: "Java", registry: "Maven Central", package: "io.paymos:paymos-java" },
  { language: "Ruby", registry: "RubyGems", package: "paymos" },
  { language: "Rust", registry: "crates.io", package: "paymos" },
] as const;

const SUPPORTED_NETWORKS = {
  deposit_networks: [
    "TRC20",
    "ERC20",
    "BEP20",
    "POLYGON",
    "ARBITRUM",
    "OPTIMISM",
    "BASE",
    "TON",
    "AVAX",
    "SOL",
    "NEAR",
    "SUI",
    "PLASMA",
  ],
  withdrawal_networks: [
    "TRC20",
    "ERC20",
    "BEP20",
    "POLYGON",
    "ARBITRUM",
    "OPTIMISM",
    "BASE",
    "TON",
    "AVAX",
    "SOL",
    "PLASMA",
  ],
  deposit_only_networks: ["NEAR", "SUI"],
  assets: {
    stablecoins: ["USDT", "USDC", "USD1", "DAI"],
    gold_backed: ["XAUT"],
  },
  note: "Paymos accepts 5 assets (4 stablecoins: USDT, USDC, USD1, DAI, plus 1 gold-backed asset: XAUT — never describe XAUT as a stablecoin) across 13 deposit networks; NEAR and SUI are deposit-only, and 11 networks support payouts.",
} as const;

const IMPLEMENTATION_RULES = [
  "Verify `X-Webhook-Signature` (HMAC-SHA256) against the exact raw request body byte-for-byte; during secret rotation two `v1=` signatures may be present and either valid match passes.",
  "Credit deposits or fulfill orders only after confirmation and finality (`confirmed` with `is_final: true` on payment channel deposits; terminal paid state on invoices); never fulfill on `confirming` or browser redirect alone.",
  "Deduplicate webhook deliveries by `event_id` from the verified JSON body (`X-Webhook-Id` is outside the HMAC signature and for logging only), and attribute business state by the resource ID inside `data`.",
  "Pass all monetary amounts and identifiers as strings (never floating-point numbers), and reuse `external_order_id` per project for invoice/withdrawal idempotency.",
  "Keep Sandbox and Production strictly isolated: API keys (`pk_test_` / `sk_test_` vs `pk_live_` / `sk_live_`), webhook endpoints/secrets, and payment channels are separate per environment.",
] as const;

export const LOCAL_CONNECT_TOOLS: readonly LocalToolDefinition[] = [
  {
    name: "paymos_auth_status",
    description:
      "Check the local Paymos OAuth sign-in state and active origin without network calls or opening a browser.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "recommend_payment_integration",
    description:
      "Recommend the right Paymos integration path (CMS plugin, Low-Code checkout widget, browser POS terminal, per-order invoices, payment channels for repeat deposits, or both) offline without signing in or opening a browser.",
    inputSchema: {
      type: "object",
      properties: {
        scenario: {
          type: "string",
          enum: [...INTEGRATION_SCENARIOS],
          description:
            "Choose cms_plugin for one of the 12 supported CMS plugins, checkout_widget for the Low-Code JS Pay button/iframe, pos_terminal for the browser-based in-person QR terminal, order_checkout for server-side per-order invoices, repeat_deposits for permanent customer deposit addresses (payment channels), both for invoices plus payment channels, or unsure to ask clarifying questions.",
        },
        platform_or_cms: {
          type: "string",
          description:
            "Optional CMS or platform name (e.g. woocommerce, whmcs, prestashop, magento2, opencart, shopware6, cscart, easy-digital-downloads, drupal-commerce, hikashop, givewp, odoo, or custom stack).",
        },
        has_backend: {
          type: "boolean",
          description:
            "Optional flag indicating whether the merchant runs a custom backend capable of HMAC-authenticated API calls and webhook verification.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "verify_webhook_signature",
    description:
      "Verify the X-Webhook-Signature header of a Paymos webhook against its raw body locally (no network call or browser). Header format: t={unix},v1={hmac_hex(\"{unix}.{payload}\")}; during secret rotation two v1= values are present and either may match.",
    inputSchema: {
      type: "object",
      properties: {
        payload: {
          type: "string",
          minLength: 1,
          description: "The raw webhook request body exactly as received byte-for-byte.",
        },
        signature_header: {
          type: "string",
          description: "The X-Webhook-Signature header value, e.g. t=1760000000,v1=9f2c...",
        },
        secret: {
          type: "string",
          description: "Webhook secret (whsec_...); defaults to PAYMOS_WEBHOOK_SECRET if omitted.",
        },
        tolerance_seconds: {
          type: "integer",
          minimum: 0,
          description: "Maximum allowed age in seconds for t= (default 300).",
        },
      },
      required: ["payload", "signature_header"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textJson(value: unknown): LocalToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function toolValidationError(code: string, message: string): LocalToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: code, message }, null, 2) }],
  };
}

function checkAllowedKeys(args: Record<string, unknown>, allowed: readonly string[]): string | undefined {
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      return `Unexpected argument "${key}".`;
    }
  }
  return undefined;
}

function normalizePlatformKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function detectCmsPlugin(platformOrCms?: string): CmsCatalogEntry | undefined {
  if (!platformOrCms) return undefined;
  const normalized = normalizePlatformKey(platformOrCms);
  if (normalized === "") return undefined;
  const tokens = platformOrCms
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  for (const entry of CMS_CATALOG) {
    if (
      entry.aliases.some(
        alias =>
          normalized === alias
          || tokens.includes(alias)
          || (alias.length >= 6 && normalized.includes(alias)),
      )
    ) {
      return entry;
    }
  }
  return undefined;
}

function handleAuthStatus(rawArgs: unknown, context: LocalConnectContext): LocalToolResult {
  if (rawArgs !== undefined && !isPlainObject(rawArgs)) {
    return toolValidationError("invalid_arguments", "paymos_auth_status arguments must be an object.");
  }
  if (rawArgs !== undefined) {
    const unknown = checkAllowedKeys(rawArgs, []);
    if (unknown) return toolValidationError("invalid_arguments", unknown);
  }

  const nowMs = (context.now ?? Date.now)();
  let sessionState: "active" | "refreshable" | "none" = "none";
  try {
    const store = readTokenStore(context.tokenFile, context.platform);
    const session = store.origins[context.origin];
    if (session) {
      if (session.expires_at > nowMs + DEFAULT_EXPIRY_SKEW_MS) {
        sessionState = "active";
      } else if (typeof session.refresh_token === "string" && session.refresh_token !== "") {
        sessionState = "refreshable";
      }
    }
  } catch {
    sessionState = "none";
  }

  const signedIn = sessionState !== "none";
  const mode = signedIn ? "workspace_and_reference" : "reference_only";
  const guidance = signedIn
    ? `Signed in for ${context.origin} (${sessionState}). Account and sandbox tools (get_connection_status, merchant_*, playground_*) as well as offline docs and advisor tools are ready.`
    : `Not signed in for ${context.origin}. Offline docs (paymos://docs/*) and local advisor/webhook tools work without signing in. Run \`npx -y @paymos/mcp setup\` or ask to call an account tool when you want to sign in via browser OAuth.`;

  return textJson({
    signed_in: signedIn,
    session_state: sessionState,
    origin: context.origin,
    mode,
    setup_command: "npx -y @paymos/mcp setup",
    guidance,
  });
}

function buildScenarioAdvice(
  scenario: IntegrationScenario,
  detectedCms: CmsCatalogEntry | undefined,
  platformOrCms: string | undefined,
  hasBackend: boolean | undefined,
) {
  const cmsList = CMS_CATALOG.map(({ id, name, doc_uri }) => ({ id, name, doc_uri }));
  const detectedPayload = detectedCms
    ? {
        id: detectedCms.id,
        name: detectedCms.name,
        doc_uri: detectedCms.doc_uri,
        ...(detectedCms.repository !== undefined ? { repository: detectedCms.repository } : {}),
      }
    : undefined;

  switch (scenario) {
    case "cms_plugin": {
      const summary = detectedCms
        ? `Use the official Paymos plugin for ${detectedCms.name}. Connect it in one step using the plugin's "Connect Paymos" button and browser approval (both Sandbox and Live credentials plus webhooks are provisioned automatically without manually copying API keys).`
        : platformOrCms
          ? `No dedicated Paymos CMS plugin matches "${platformOrCms}". Paymos provides 12 official CMS plugins (listed in supported_cms_plugins); for other platforms use the Low-Code JavaScript SDK (checkout_widget) or per-order Server SDK invoices (order_checkout).`
          : "Use one of Paymos's 12 official CMS plugins for one-click OAuth store setup (Sandbox and Live keys plus webhooks are provisioned automatically—no manual API key entry).";
      const recommendedDocs = detectedCms
        ? [detectedCms.doc_uri, "paymos://docs/overview", "paymos://docs/webhooks-verify", "paymos://docs/testing-sandbox"]
        : ["paymos://docs/overview", "paymos://docs/widget-sdk", "paymos://docs/cms-woocommerce"];
      return {
        scenario,
        recommendation: "cms_plugin",
        summary,
        ...(detectedPayload !== undefined ? { detected_cms: detectedPayload } : {}),
        supported_cms_plugins: cmsList,
        recommended_docs: recommendedDocs,
        workspace_next_steps: [
          detectedCms
            ? `Read ${detectedCms.doc_uri} offline via resources/read for ${detectedCms.name} requirements, install ZIP/package, and Connect Paymos flow.`
            : "Read the matching paymos://docs/cms-* resource via resources/read, or switch to paymos://docs/widget-sdk if your store is custom.",
          "Test a simulated checkout in Sandbox mode before switching the plugin toggle to Live.",
          "If you want to inspect existing projects or endpoints in your Paymos account, ask to sign in or check `paymos_auth_status` first.",
        ],
      };
    }
    case "checkout_widget":
      return {
        scenario,
        recommendation: "checkout_widget",
        summary:
          "Use the Paymos Low-Code JavaScript SDK (`/v1/paymos-widget.js`) when you want a fast Pay button without building custom invoice-signing backend forms. Load the script and mount it explicitly with `PaymosWidget.mount('#selector', { ... })` (two lines: `<script>` + `mount()`; there is no auto-init `data-*` API). Amount priority order is `price_id`, static `amount`, `get_amount` callback, `amount_selector` (reads `.value`), then `pos_url`. Supports iframe overlay (default) or redirect.",
        recommended_docs: [
          "paymos://docs/widget-sdk",
          "paymos://docs/supported-currencies",
          "paymos://docs/webhooks-verify",
          "paymos://docs/testing-sandbox",
        ],
        workspace_next_steps: [
          "Read paymos://docs/widget-sdk offline via resources/read for mount options, events (`paymos:opened`, `paymos:closed`, `paymos:succeeded`, `paymos:failed`, `paymos:error`), and styling.",
          "Use `price_id` (server-configured price) when you have no backend, and verify webhooks with `verify_webhook_signature` if you listen for fulfillment events.",
          "Optionally sign in via Paymos OAuth (`get_connection_status` / `merchant_create_widget_price`) when ready to configure widget prices in a project.",
        ],
      };
    case "pos_terminal":
      return {
        scenario,
        recommendation: "pos_terminal",
        summary:
          "Use the browser-based Paymos POS Terminal for in-person payments on a phone or tablet with zero hardware pairing. Each Terminal project provides one project URL supporting 46 fiat invoicing currencies, locks the FX rate when the payer confirms asset and network, shows a QR payment URI/address, and keeps the confirmed screen until the cashier taps to start the next amount.",
        recommended_docs: [
          "paymos://docs/widget-terminal",
          "paymos://docs/supported-currencies",
          "paymos://docs/overview",
        ],
        workspace_next_steps: [
          "Read paymos://docs/widget-terminal offline via resources/read for terminal project setup and cashier workflow.",
          "Note that integration method (`Terminal`) is chosen when creating a project and cannot be toggled afterward—create a dedicated Terminal project if needed.",
          "Optionally sign in to inspect or retrieve terminal links (`merchant_get_terminal_links`) when requested.",
        ],
      };
    case "order_checkout": {
      const backendNote = hasBackend === false
        ? " Note: you indicated `has_backend: false`; server-side invoice creation requires HMAC-SHA256 API signing on a backend—consider `checkout_widget` with `price_id` or `pos_terminal` if you do not run a server."
        : "";
      return {
        scenario,
        recommendation: "invoice",
        summary:
          `Use per-order Invoices via an official server SDK or REST API (\`POST /v1/invoices\`). Each invoice has a fixed amount, expiry, optional \`customer_fee_percent\`, idempotency via \`external_order_id\`, and a \`payment_url\` for Hosted Checkout (or Host-to-Host via \`confirm-payment\`).${backendNote}`,
        recommended_docs: [
          "paymos://docs/quick-start",
          "paymos://docs/payment-flow",
          "paymos://docs/hosted-checkout",
          "paymos://docs/server-sdks",
          "paymos://docs/webhooks-verify",
          "paymos://docs/testing-sandbox",
          "paymos://docs/errors",
        ],
        workspace_next_steps: [
          "Read paymos://docs/quick-start, paymos://docs/hosted-checkout, and paymos://docs/server-sdks via resources/read.",
          "Install the matching server SDK (`sdks` list), create invoices with decimal-string `amount` and unique `external_order_id`, and verify webhooks with `verify_webhook_signature`.",
          "In Sandbox, test `paid`, `overpaid`, `underpay`, `cancel`, and `paid_late` outcomes before switching to Production.",
        ],
      };
    }
    case "repeat_deposits": {
      const backendNote = hasBackend === false
        ? " Note: you indicated `has_backend: false`; managing payment channels and polling/verifying deposit webhooks requires a backend service."
        : "";
      return {
        scenario,
        recommendation: "payment_channel",
        summary:
          `Use Payment Channels (\`POST /v1/payment-channels\`) for repeated customer deposits and account top-ups. Each channel maps one payer (\`external_id\`) to permanent deposit addresses per enabled network with no set amount or expiry. Transfers below the minimum deposit are neither credited nor returned. Credit customer balances only on \`payment_channel.deposit.confirmed\` with \`is_final: true\`, and reconcile via the cursor-based deposit feed.${backendNote}`,
        recommended_docs: [
          "paymos://docs/payment-channels-create",
          "paymos://docs/payment-channel-deposits-list",
          "paymos://docs/supported-currencies",
          "paymos://docs/webhooks-verify",
          "paymos://docs/server-sdks",
        ],
        workspace_next_steps: [
          "Read paymos://docs/payment-channels-create and paymos://docs/payment-channel-deposits-list via resources/read.",
          "Poll confirmed channel deposits keeping `next_cursor` even across empty pages (cursors expire after 24 hours; keep `confirmed_from` fixed for the initial poll), and deduplicate on `event_id` / deposit ID.",
          "Use Sandbox `playground_*` simulation tools (only when signed in and requested) to test `confirming`, `reorged`, and `confirmed` deposit stages.",
        ],
      };
    }
    case "both": {
      const backendNote = hasBackend === false
        ? " Note: you indicated `has_backend: false`; combining Invoices and Payment Channels requires a server backend for HMAC signing and webhook/feed verification."
        : "";
      return {
        scenario,
        recommendation: "both",
        summary:
          `Combine Invoices (for fixed-price order checkouts) and Payment Channels (for recurring customer balance top-ups) in your integration. Create separate Sandbox and Production resources, credit channel deposits only when \`confirmed\` and \`is_final: true\`, verify every webhook signature on raw bytes, and deduplicate by \`event_id\`.${backendNote}`,
        recommended_docs: [
          "paymos://docs/overview",
          "paymos://docs/hosted-checkout",
          "paymos://docs/payment-channels-create",
          "paymos://docs/payment-channel-deposits-list",
          "paymos://docs/webhooks-verify",
          "paymos://docs/server-sdks",
          "paymos://docs/testing-sandbox",
        ],
        workspace_next_steps: [
          "Read paymos://docs/hosted-checkout, paymos://docs/payment-channels-create, and paymos://docs/webhooks-verify via resources/read.",
          "Use one of the 8 official server SDKs (`sdks`) so request signing, retries, cursor pagination, and dual-`v1=` webhook verification match the Paymos contract.",
          "Use `verify_webhook_signature` locally while building your webhook handler.",
        ],
      };
    }
    case "unsure": {
      const cmsHint = detectedCms
        ? ` Detected platform "${detectedCms.name}" has an official plugin (${detectedCms.doc_uri}) if you want plug-and-play store checkout.`
        : "";
      return {
        scenario: "unsure",
        recommendation: "unsure",
        summary:
          `Do not pick an integration yet—clarify the merchant's setup first. Ask: (1) Are you integrating an existing store/CMS (such as WooCommerce, WHMCS, PrestaShop, Magento 2, OpenCart, Shopware 6, CS-Cart, EDD, Drupal Commerce, HikaShop, GiveWP, or Odoo)? (2) Do you want a Low-Code Pay button on a web page or an in-person browser POS terminal without backend code? (3) Or with a backend, will customers pay per order (Invoices), repeatedly top up an account (Payment Channels), or both?${cmsHint}`,
        ...(detectedPayload !== undefined ? { detected_cms: detectedPayload } : {}),
        supported_cms_plugins: cmsList,
        recommended_docs: [
          "paymos://docs/overview",
          "paymos://docs/quick-start",
          "paymos://docs/widget-sdk",
          "paymos://docs/widget-terminal",
          "paymos://docs/payment-channels-create",
        ],
        workspace_next_steps: [
          "Ask the clarifying questions above and respect the merchant's stated preference.",
          "Re-run `recommend_payment_integration` with the chosen `scenario` (or `platform_or_cms`) once confirmed.",
        ],
      };
    }
  }
}

function handleRecommendIntegration(rawArgs: unknown): LocalToolResult {
  if (rawArgs !== undefined && !isPlainObject(rawArgs)) {
    return toolValidationError("invalid_arguments", "recommend_payment_integration arguments must be an object.");
  }
  const args = rawArgs ?? {};
  const unknown = checkAllowedKeys(args, ["scenario", "platform_or_cms", "has_backend"]);
  if (unknown) return toolValidationError("invalid_arguments", unknown);

  if (args.scenario !== undefined) {
    if (typeof args.scenario !== "string" || !(INTEGRATION_SCENARIOS as readonly string[]).includes(args.scenario)) {
      return toolValidationError(
        "invalid_scenario",
        `Unknown scenario "${String(args.scenario)}". Expected one of: ${INTEGRATION_SCENARIOS.join(", ")}.`,
      );
    }
  }
  if (args.platform_or_cms !== undefined && typeof args.platform_or_cms !== "string") {
    return toolValidationError("invalid_arguments", "platform_or_cms must be a string.");
  }
  if (args.has_backend !== undefined && typeof args.has_backend !== "boolean") {
    return toolValidationError("invalid_arguments", "has_backend must be a boolean.");
  }

  const explicitScenario = args.scenario as IntegrationScenario | undefined;
  const platformOrCms = args.platform_or_cms as string | undefined;
  const hasBackend = args.has_backend as boolean | undefined;
  const detectedCms = detectCmsPlugin(platformOrCms);

  let selectedScenario: IntegrationScenario;
  if (explicitScenario !== undefined) {
    selectedScenario = explicitScenario;
  } else if (detectedCms !== undefined) {
    selectedScenario = "cms_plugin";
  } else if (hasBackend === false) {
    selectedScenario = "checkout_widget";
  } else {
    selectedScenario = "unsure";
  }

  const advice = buildScenarioAdvice(selectedScenario, detectedCms, platformOrCms, hasBackend);
  return textJson({
    ...advice,
    sdks: SERVER_SDKS,
    supported_networks: SUPPORTED_NETWORKS,
    implementation_rules: IMPLEMENTATION_RULES,
  });
}

function handleVerifyWebhookSignature(rawArgs: unknown, context: LocalConnectContext): LocalToolResult {
  if (!isPlainObject(rawArgs)) {
    return toolValidationError("invalid_arguments", "verify_webhook_signature arguments must be an object.");
  }
  const unknown = checkAllowedKeys(rawArgs, ["payload", "signature_header", "secret", "tolerance_seconds"]);
  if (unknown) return toolValidationError("invalid_arguments", unknown);

  if (typeof rawArgs.payload !== "string" || rawArgs.payload.length === 0) {
    return toolValidationError("invalid_arguments", "payload must be a non-empty raw string.");
  }
  if (typeof rawArgs.signature_header !== "string") {
    return toolValidationError("invalid_arguments", "signature_header must be a string.");
  }
  if (rawArgs.secret !== undefined && typeof rawArgs.secret !== "string") {
    return toolValidationError("invalid_arguments", "secret must be a string when provided.");
  }
  if (
    rawArgs.tolerance_seconds !== undefined
    && (typeof rawArgs.tolerance_seconds !== "number"
      || !Number.isSafeInteger(rawArgs.tolerance_seconds)
      || rawArgs.tolerance_seconds < 0)
  ) {
    return toolValidationError("invalid_arguments", "tolerance_seconds must be a non-negative integer.");
  }

  const rawSecret = rawArgs.secret !== undefined ? rawArgs.secret : context.env.PAYMOS_WEBHOOK_SECRET;
  const effectiveSecret = typeof rawSecret === "string" ? rawSecret.trim() : "";
  if (effectiveSecret === "") {
    return textJson({ valid: false, reason: "missing_secret" });
  }

  const tolerance = rawArgs.tolerance_seconds === undefined ? 300 : rawArgs.tolerance_seconds;
  const verifier = new WebhookVerifier(effectiveSecret, tolerance);
  const nowSeconds = context.now ? Math.floor(context.now() / 1000) : undefined;
  try {
    verifier.assertValid(rawArgs.signature_header, rawArgs.payload, nowSeconds);
    return textJson({ valid: true });
  } catch (error) {
    if (error instanceof TimestampSkewError) {
      return textJson({ valid: false, reason: "expired" });
    }
    return textJson({ valid: false, reason: "bad_signature" });
  }
}

export async function tryHandleLocalConnectTool(
  name: string,
  rawArgs: unknown,
  context: LocalConnectContext,
): Promise<LocalToolResult | undefined> {
  switch (name) {
    case "paymos_auth_status":
      return handleAuthStatus(rawArgs, context);
    case "recommend_payment_integration":
      return handleRecommendIntegration(rawArgs);
    case "verify_webhook_signature":
      return handleVerifyWebhookSignature(rawArgs, context);
    default:
      return undefined;
  }
}
