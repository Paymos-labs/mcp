---
name: paymos-integrate
description: Choose and implement the right Paymos payment integration (12 official CMS plugins, Low-Code JS widget, browser POS terminal, Hosted Checkout, Host-to-Host API, Telegram Bot checkout, Payment Channels, and 8 server SDKs) with accurate Paymos asset/network rules and zero-secret .env delivery.
---

# Paymos Integration Guide

Use this skill whenever a merchant or developer asks how to accept crypto payments with Paymos, choose between Paymos integration modes, install an official CMS plugin or server SDK, configure supported assets/networks, or write Paymos credentials safely to `.env`.

## 1. Pick the Right Integration Path

Respect an explicit merchant choice. If the merchant has not chosen yet, ask three clarifying questions first:
1. Are you using a supported store/CMS platform?
2. Do you want a Low-Code web Pay button or an in-person browser POS terminal without custom backend signing?
3. If you run a backend, do customers pay per fixed order (**Invoices**), top up a balance repeatedly (**Payment Channels**), or both?

When `@paymos/mcp connect` is available locally, you can call `recommend_payment_integration` and read `paymos://docs/*` resources completely offline before OAuth login.

### Integration Surfaces

| Path | Best For | Key Mechanics & Boundaries |
|---|---|---|
| **12 Official CMS Plugins** | Turnkey e-commerce & donations | One-click `Connect Paymos` OAuth approval provisions both Sandbox and Live Payment keys plus the Invoice webhook automatically—never ask the merchant to paste API keys manually. Reconnecting updates rotated keys. |
| **Low-Code JS Widget** (`/v1/paymos-widget.js`) | Fast Pay button on any web page without backend HMAC signing | Two lines: `<script>` plus explicit `PaymosWidget.mount('#selector', { ... })` (**no auto-init and no `data-*` attribute API**). Amount priority: `price_id` → static `amount` → `get_amount` callback → `amount_selector` (reads `.value`) → `pos_url`. Modes: iframe overlay (default) or `redirect`. Authenticated with publishable `X-Sdk-Key` against `/public/v1/sdk` (separate from Merchant API; **one allowed browser origin per project**). Window events: `paymos:opened`, `paymos:closed`, `paymos:succeeded`, `paymos:failed`, `paymos:error`. |
| **Browser POS Terminal** | In-person counter payments on phone/tablet | Zero hardware pairing; one terminal URL per Terminal project (integration method is fixed at project creation and cannot be toggled afterward). Supports **45 fiat invoicing currencies**, locks FX rate at `confirm-payment`, shows QR payment URI/address, and stays on the confirmed screen until the cashier taps to start the next payment. |
| **Hosted Checkout** (`POST /v1/invoices`) | Custom backend per-order checkout | Fixed amount (fiat or crypto), expiry window, optional `customer_fee_percent` (`0–100`), optional display-only `products[]` (1–50 items, no image field), idempotent via `external_order_id` (`wgt_` prefix is reserved for the widget), returns `payment_url`. Hosted/embedded surfaces always keep the "Secured by Paymos" footer (no custom CNAME). |
| **Host-to-Host** (`POST /v1/invoices/{id}/confirm-payment`) | Custom unbranded UI rendered by the merchant | Calling `confirm-payment` with a Payment key locks the FX rate, restarts the payment window, allocates the deposit address, and returns merchant commercial fields (fee/net). Paymos renders nothing on the payer screen. |
| **Telegram Bot Checkout** | Payers paying directly inside Telegram | Project checkout channel where `payment_url` is a Telegram bot deep link (`?start=inv_{id}`); the bot confirms asset/network inside Telegram and renders an address-only QR code. |
| **Payment Channels** (`POST /v1/payment-channels`) | Recurring customer balance top-ups | Permanent deposit addresses per enabled network for one payer (`external_id`), idempotent creation (`200` on replay with current addresses/minimums), no fixed amount or expiry. Transfers below the live per-rail `minimum_deposit` are skipped (neither credited nor returned; absent `minimum_deposit` means unavailable, never zero). Credit only on `payment_channel.deposit.confirmed` with `is_final: true` and reconcile via the 24-hour cursor deposit feed. |

### 12 Official CMS Plugins

| Platform | Repository | Notes |
|---|---|---|
| WooCommerce | `Paymos-labs/woocommerce` | Forwards cart `products[]`; native refunds |
| WHMCS | `Paymos-labs/whmcs` | Forwards `products[]` |
| PrestaShop | `Paymos-labs/prestashop` | PrestaShop `1.7.8` through `9.x`; forwards `products[]` |
| Magento 2 / Adobe Commerce | `Paymos-labs/magento2` | Forwards `products[]` |
| OpenCart | `Paymos-labs/opencart` | OpenCart `4.0.2.0` or later; forwards `products[]` |
| Shopware 6 | `Paymos-labs/shopware6` | Per-sales-channel config; forwards `products[]` |
| CS-Cart | `Paymos-labs/cscart` | Supports Multi-Vendor; forwards `products[]` |
| Easy Digital Downloads | `Paymos-labs/edd` | Forwards `products[]` |
| Drupal Commerce | `Paymos-labs/drupal-commerce` | Composer `drupal/commerce_paymos:^1.0`; forwards `products[]` |
| HikaShop (Joomla) | `Paymos-labs/hikashop` | Joomla 5.4/6.2; forwards `products[]` |
| GiveWP | `Paymos-labs/givewp` | One-time donations (amount-only, no `products[]`) |
| Odoo 20.0 | `Paymos-labs/odoo` | Self-hosted Odoo 20.0; forwards `products[]` |

### 8 Official Server SDKs

All 8 official SDKs follow the same conformance contract: HMAC-SHA256 signing (`{timestamp}\n{METHOD}\n{path}\n{query}\n{body_hash}`), safe-method + `429` retry honoring `Retry-After` (never blindly replaying ambiguous `POST` failures—rely on `external_order_id`), cursor pagination, and raw-body dual-`v1=` webhook verification. Do not hardcode SDK version numbers.

| Language | Registry | Package |
|---|---|---|
| TypeScript / JavaScript | npm | `@paymos/sdk` |
| Python | PyPI | `paymos-sdk` |
| PHP | Packagist | `paymos/php-sdk` *(also includes the CMS plugin integration/reconciliation layer)* |
| Go | Go modules | `github.com/Paymos-labs/go-sdk/v2` |
| .NET | NuGet | `Paymos` |
| Java | Maven Central | `io.paymos:paymos-java` |
| Ruby | RubyGems | `paymos` |
| Rust | crates.io | `paymos` |

## 2. Canonical Product Facts (Do Not Drift)

- **5 settlement assets**:
  - **4 stablecoins**: `USDT`, `USDC`, `USD1`, `DAI`.
  - **1 gold-backed asset**: `XAUT` (accepted on Ethereum). **Never classify or describe `XAUT` as a stablecoin.**
  - Native gas coins (`BTC`, `ETH`, `BNB`, `TRX`, `POL`, `GRAM`, `AVAX`, `SOL`, `NEAR`, `SUI`, `XPL`) are not accepted as invoice payment assets. No card processing, no forced conversion, and no fiat/bank off-ramps.
- **13 deposit networks / 11 withdrawal networks**:
  - Deposit (`13`): `TRC20` (Tron), `ERC20` (Ethereum), `BEP20` (BSC), `POLYGON`, `ARBITRUM`, `OPTIMISM`, `BASE`, `TON` (native gas coin is `GRAM`; network name/code remains `TON`), `AVAX` (Avalanche), `SOL` (Solana), `NEAR`, `PLASMA`, `SUI`.
  - Withdrawal (`11`): same list **excluding `NEAR` and `SUI`**, which are **deposit-only**.
- **45 fiat invoicing currencies**: FX rate locks at `confirm-payment`.
- **Fees**: Standard `1.0%` incoming processing fee (floored/rounded down, pinned at invoice creation, `0–100%` pass-through via `customer_fee_percent`; high-volume merchants may qualify for `0.3%` on request). `0%` Paymos withdrawal commission—only the route's disclosed, subsidised network fee applies; failed or cancelled payouts return 100% of `amount + fee`.
- **API keys, quotas & errors**:
  - Separate Payment (`pk_`: invoices, payment channels, refunds) and Payout (`rk_`: withdrawals and balances) HMAC-SHA256 keys; max 1 active of each per environment.
  - Pass every monetary amount as an exact decimal string, never a float.
  - Sync clock drift with unauthenticated `GET /v1/time` (`X-Request-Timestamp` allows 5 min past, 60 s future).
  - Rate limits: `30 req/s` per merchant (`5 req/s` on `POST /v1/invoices`), returning `429` with `Retry-After: 1`.
  - Errors use RFC 9457 `application/problem+json` with stable machine-readable `code`.
- **What Paymos does NOT do**: no card processing, no bank off-ramps, no recurring/subscription auto-charges, no scheduled payouts, no marketplace split payments, no reusable multi-payer payment links, no WalletConnect, no native mobile SDKs, no custom checkout CNAME.

## 3. Writing API & Webhook Secrets Safely into `.env`

Never echo raw `sk_...` or `whsec_...` values into chat or commit them to Git. When provisioning credentials via Merchant MCP, use the proof-bound local CLI installer:

```bash
# Step 1: Prepare a local verifier bound to the target .env file, merchant, environment, and operation
npx -y @paymos/mcp install-secret --prepare \
  --file .env \
  --merchant-id "$PAYMOS_MERCHANT_ID" \
  --environment production \
  --operation-id "$PAYMOS_OPERATION_ID"

# Step 2: Pass the printed request_id and challenge in the MCP tool's `delivery` input

# Step 3: Redeem the returned single-use otk_... ticket on the same machine
npx -y @paymos/mcp install-secret \
  --file .env \
  --request-id "$PAYMOS_REQUEST_ID" \
  --token "$PAYMOS_INSTALLER_TICKET"
```

After setting up the integration, switch to the **`paymos-webhooks`** skill for handler verification and **`paymos-sandbox`** for end-to-end simulation before going Live.
