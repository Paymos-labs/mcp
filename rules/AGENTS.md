# Paymos Integration & Merchant MCP Guardrails

Follow these exact Paymos invariants whenever designing, writing, testing, or debugging Paymos integrations or operating a Paymos merchant account via Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`).

## Assets, Networks, and Currencies

- **5 settlement assets**: 4 stablecoins (`USDT`, `USDC`, `USD1`, `DAI`) plus 1 gold-backed asset (`XAUT`). Never classify or describe `XAUT` as a stablecoin.
- **No cards, no native gas coins, no bank off-ramps**: Paymos settles in the accepted asset with no forced conversion to fiat, BTC, or ETH.
- **13 deposit networks / 11 withdrawal networks**: Deposit on `TRC20`, `ERC20`, `BEP20`, `POLYGON`, `ARBITRUM`, `OPTIMISM`, `BASE`, `TON` (native gas coin ticker is `GRAM`; the network name and code stay `TON`), `AVAX`, `SOL`, `NEAR`, `PLASMA`, `SUI`. **NEAR** and **SUI** are **deposit-only**; only 11 networks support withdrawals.
- **45 fiat invoicing currencies**: FX rate locks when the asset and network are confirmed (`confirm-payment`).

## API Contracts and Idempotency

- **String amounts**: Always pass monetary amounts and identifiers as exact decimal strings—never floating-point numbers.
- **Key separation**: Payment keys (`pk_`) authenticate invoices, payment channels, and refunds; Payout keys (`rk_`) authenticate withdrawals and balances. Maximum 1 active key of each type per environment. Merchant API uses HMAC-SHA256 (not Bearer tokens); the Low-Code widget uses publishable `X-Sdk-Key` on `/public/v1/sdk`.
- **Idempotency**: Reuse `external_order_id` for invoice and withdrawal creation (`200` on exact replay, `409` on mismatch; prefix `wgt_` is reserved for the Low-Code widget). Payment channel creation is idempotent per `(project_id, external_id)`.
- **Low-Code JS Widget**: `/v1/paymos-widget.js` requires an explicit `PaymosWidget.mount('#selector', { ... })` call—there is no auto-init `data-*` attribute API.
- **Strict Sandbox / Production isolation**: Keep Sandbox (`pk_test_` / `sk_test_`) and Production (`pk_live_` / `sk_live_`) credentials, webhook endpoints/secrets, and payment channels completely separate.

## Invoice Statuses, Webhook Security, and Finality

- **Exact 9 invoice statuses** (closed set): `awaiting_client`, `awaiting_payment`, `confirming`, `underpaid_waiting`, `paid`, `paid_over`, `underpaid`, `expired`, `cancelled`.
- **Exact 9 invoice webhook events** (closed set): `invoice.awaiting_payment`, `invoice.confirming`, `invoice.paid`, `invoice.paid_over`, `invoice.underpaid`, `invoice.underpaid_waiting`, `invoice.expired`, `invoice.cancelled`, and the note-only `invoice.paid_late` (sets `paid_late_at` on a closed `expired`/`underpaid` invoice without reopening it—record a note for review, never auto-fulfill).
- **Payment channel events (3)**: `payment_channel.deposit.confirming`, `payment_channel.deposit.confirmed`, `payment_channel.deposit.reorged`. Credit customer balances only on `payment_channel.deposit.confirmed` with `is_final: true`.
- **Withdrawal events (6)**: `withdrawal.created`, `withdrawal.processing`, `withdrawal.completed`, `withdrawal.failed`, `withdrawal.cancelled`, `withdrawal.completion_rewound` (branch on `is_final`).
- **Raw-body signature check**: Verify `X-Webhook-Signature` (`t={unix},v1={hmac_hex}`) using HMAC-SHA256 over `{timestamp}.{raw_request_body}` byte-for-byte with constant-time comparison. Parse `v1` as a list so dual-`v1=` 24-hour rotation windows pass when either signature matches. Default receiver replay tolerance is `300` seconds.
- **Deduplication & attribution**: Deduplicate deliveries by `event_id` from the verified JSON body—never `X-Webhook-Id` (which sits outside the HMAC signature and is for logging only). Attribute orders by the resource ID inside `data`, and reverse-verify via `GET /v1/invoices/{id}` before fulfilling. Never fulfill on `confirming` or browser redirect alone.

## Merchant MCP Security & Handoff Protocol

- **Mandatory `continue_url` handoff**: Whenever a tool returns `status: "user_action_required"`, always print the full clickable `continue_url` verbatim in chat, wait for the user to finish browser OAuth or 2FA/Passkey confirmation, and retry the exact call reusing the same `operation_id` when present.
- **Zero-secret delivery**: Never place raw API secrets (`sk_...`) or webhook secrets (`whsec_...`) in chat. Use `npx -y @paymos/mcp install-secret` (`otk_*` tickets) for `.env` writes and `download-file` / `upload-file` (`ftk_*` tickets) for binary files.
- **Dashboard-only withdrawal whitelist**: Adding new withdrawal whitelist addresses (or requesting whitelist opt-out) happens only in the Paymos Dashboard, never over MCP or the Merchant API.
