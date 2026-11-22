---
name: paymos-sandbox
description: Run end-to-end tests in Paymos Sandbox through Merchant MCP or Sandbox API — simulating invoice outcomes (paid, overpaid, underpay, cancel, paid_late), payment channel deposits (confirming, reorged, confirmed), refunds, withdrawals, and webhook deliveries with strict environment isolation.
---

# Paymos Sandbox Testing Guide

Use this skill whenever verifying a Paymos integration end-to-end in Sandbox—creating test invoices, simulating payment lifecycles, testing payment channel deposit feeds, testing refunds or withdrawals, and checking webhook handlers without moving real funds.

## 1. Enforce Strict Sandbox vs Production Isolation

Before running any simulation:
1. Confirm the active session and granted environments via `get_connection_status` (or local `paymos_auth_status`).
2. Ensure every tool call targets **Sandbox** (`playground_*` tools, or `environment: "Sandbox"` — PascalCase per the MCP tool JSON Schema `"Production" | "Sandbox"` — on `merchant_*` tools, or `pk_test_`/`sk_test_` keys in application code).
3. Remember the exact isolation boundaries:
   - Sandbox (`Test` toggle in the dashboard, `Sandbox` badge on checkout, `pk_test_`/`sk_test_` keys) and Production (`Live`, `pk_live_`/`sk_live_` keys) have completely separate credentials, invoices, payment channels, balances, and webhook endpoints/secrets.
   - `external_order_id` uniqueness is scoped per `(project_id, environment, external_order_id)`.
   - Sandbox uses virtual balances and is **not** AML-screened.
   - Dashboard batch payout runs (up to 50 recipients) are **Production-only**—never try to rehearse a batch payout run in Sandbox.
   - Simulators are strictly server-gated to Sandbox; live keys (`pk_live_`/`sk_live_`) are always rejected.

## 2. End-to-End Invoice Simulation Matrix

Test all five Sandbox invoice simulation stages (`playground_create_invoice` → optional `playground_confirm_invoice_payment` → `playground_simulate_invoice_payment` or `POST /v1/sandbox/invoices/{id}/simulate-payment`):

| Stage | Behaviour in Sandbox | Expected Webhook & State | What Your App Must Verify |
|---|---|---|---|
| `paid` | Settles the remaining expected amount | `invoice.paid` (`status: "paid"`, `is_final: true`) | Reverse-verify `GET /v1/invoices/{id}`, mark order paid once, verify idempotency on replay |
| `overpaid` | Pays remainder plus a positive random excess | `invoice.paid_over` (`status: "paid_over"`, `is_final: true`) | Fulfill order and handle surplus per merchant commercial policy |
| `underpay` | Pays a positive random partial amount below auto-confirm threshold | `invoice.underpaid_waiting` (`status: "underpaid_waiting"`) | Keep order unpaid; repeated `underpay` accumulates without re-emitting a duplicate webhook while status stays `underpaid_waiting`; follow with `paid` to complete or let expire to `underpaid` |
| `cancel` | Cancels an open invoice | `invoice.cancelled` (`status: "cancelled"`, `is_final: true`) | Mark order cancelled; do not fulfill |
| `paid_late` | **Simulation scenario (not an invoice status)** applied to a closed `expired` or `underpaid` invoice | `invoice.paid_late` (sets `paid_late_at`; `status` remains `expired`/`underpaid`, `is_final: true`) | Record an order note for review; **never** auto-fulfill or reopen the order blindly |

Also test `playground_cancel_invoice` (API cancel on an unpaid invoice) and idempotency:
- Same `external_order_id` + identical amount/currency/network → `200` returning the existing invoice.
- Same `external_order_id` + changed amount or currency → `409 conflict`.

## 3. End-to-End Payment Channel Simulation

1. **Create a channel**: call `playground_create_payment_channel` (`POST /v1/payment-channels`) with `project_id` and customer `external_id`. Re-calling with the same `(project_id, external_id)` returns `200` with the existing channel and current addresses/minimums.
2. **Simulate all three deposit stages** via `playground_simulate_payment_channel_deposit` (`network` is required; each call creates a new test deposit):
   - `confirming` → emits `payment_channel.deposit.confirming`. Verify your app does **not** credit the customer.
   - `reorged` → emits `payment_channel.deposit.reorged`. Verify your app does **not** credit the customer.
   - `confirmed` (default) → emits `payment_channel.deposit.confirmed` with `is_final: true`. Verify your app credits the customer once and reads the deposit via `playground_get_payment_channel_deposit`.
3. **Verify deposit-feed polling** (`playground_list_payment_channel_deposits` / `GET /v1/payment-channel-deposits`):
   - Only `confirmed` deposits appear in the feed (oldest-first in publication order).
   - Persist `next_cursor` from **every** response—including empty pages.
   - Keep `confirmed_from` unchanged when continuing with a cursor (cursor TTL is **24 hours**; expired cursors return `400 pagination_cursor_invalid`).
   - Check the `blocked` field (`{ deposit_id, reason }`) if the cursor stops advancing.
4. **Verify channel controls**: test `playground_block_payment_channel` and `playground_unblock_payment_channel`.

## 4. Sandbox Refunds and Withdrawals

- **Refunds**:
  1. On a paid or overpaid Sandbox invoice, call `playground_create_refund` (`POST /v1/refunds`) with `invoice_id`, `mode: "full"` or `"overpayment"`, and `external_order_id` (amount and first-sender recipient are computed by the server).
  2. Call `playground_simulate_refund` (`POST /v1/sandbox/refunds/{id}/simulate`) with `completed`, `failed`, or `cancelled` and confirm via `playground_get_refund` / `playground_list_refunds`.
- **Withdrawals**:
  1. Check balances with `playground_get_balances`.
  2. Create a Sandbox payout via `playground_create_withdrawal` (or `merchant_create_sandbox_withdrawal`) with unique `external_order_id` on one of the **11 withdrawal networks** (`NEAR` and `SUI` are deposit-only).
  3. Test `playground_cancel_withdrawal` (while `created`) and `playground_simulate_withdrawal_completion` to observe `withdrawal.completed` / `is_final: true`.

## 5. Webhook & Negative-Case Go-Live Checklist

Before switching to Production credentials:
- Inspect Sandbox delivery logs via `merchant_list_webhook_events` and `merchant_get_webhook_event_detail`, and test manual replay via `merchant_replay_webhook_event`.
- Confirm your receiver passes valid signatures, passes dual-`v1=` rotation headers, rejects tampered raw bodies, rejects expired timestamps, and ignores duplicate `event_id` deliveries.
- Confirm your HTTP client handles `GET /v1/time` clock sync, `429` (`Retry-After`), and RFC 9457 `application/problem+json` error `code` values without treating prose `detail` as a contract.
- Switch credentials cleanly to separate Production `pk_live_`/`sk_live_` keys (and `rk_live_` if automating payouts), create a dedicated Production webhook endpoint/secret, and run a small real mainnet smoke test.
