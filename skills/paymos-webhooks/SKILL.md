---
name: paymos-webhooks
description: Implement, verify, rotate, and debug Paymos webhook handlers with byte-exact raw-body X-Webhook-Signature HMAC-SHA256 checks (dual v1= rotation), event_id deduplication, exact 18 event types, reverse verification, and finality rules.
---

# Paymos Webhooks & Verification Guide

Use this skill whenever implementing a Paymos webhook endpoint, verifying `X-Webhook-Signature`, designing order/deposit state transitions, rotating webhook secrets, or debugging delivery failures and replays.

## 1. Cryptographic Signature Verification (`X-Webhook-Signature`)

Every Paymos webhook delivery sends three headers:
- `X-Webhook-Signature`: `t={unix_timestamp},v1={hmac_hex}` (or `t={unix_timestamp},v1={current_hex},v1={previous_hex}` during a 24-hour secret rotation window)
- `X-Webhook-Id`: mirrors `event_id` for **logging only** (NOT covered by HMAC)
- `X-Webhook-Timestamp`: Unix seconds stamped at send time

### Mandatory Verification Rules

1. **Read the exact raw request body bytes** before any JSON parser mutates whitespace or key ordering. Never verify `JSON.stringify(req.body)`.
2. **Signed payload**: compute `HMAC-SHA256(webhook_secret, "${t}.${raw_body}")` as lowercase hex.
3. **Parse `v1` as a list, not a single value**: during a 24-hour secret rotation window (unless rotated without grace period), the header contains **two** `v1=` entries. Accept the request if **any** `v1` entry matches using **constant-time comparison**.
4. **Enforce receiver-side timestamp tolerance**: reject stale timestamps outside your chosen replay window (default **300 seconds / 5 minutes** across all 8 official SDKs).
5. Prefer an official Paymos server SDK verifier (`WebhookVerifier` / language equivalent), or test sample payloads locally using the `verify_webhook_signature` MCP tool.

```ts
// Example (Node.js / Express with express.raw({ type: "application/json" }))
import { WebhookVerifier } from "@paymos/sdk";

const verifier = new WebhookVerifier(process.env.PAYMOS_WEBHOOK_SECRET!, 300);

app.post("/webhooks/paymos", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = req.body.toString("utf8");
  const signature = req.header("X-Webhook-Signature") ?? "";

  try {
    verifier.assertValid(signature, rawBody);
  } catch {
    return res.status(401).end();
  }

  const envelope = JSON.parse(rawBody);
  // 1. Deduplicate delivery by envelope.event_id (NEVER X-Webhook-Id!)
  // 2. Enqueue / process quickly and respond 2xx within 10 seconds
  return res.status(200).end();
});
```

## 2. Envelope, Deduplication, and Order Attribution

Every event uses one common JSON envelope:

```json
{
  "event_id": "evt_...",
  "event_type": "invoice.paid",
  "version": 1,
  "occurred_at": 1760000000,
  "data": { "...": "..." }
}
```

- **Deduplicate deliveries by `event_id` from the verified JSON body**—never `X-Webhook-Id`. Because `X-Webhook-Id` is outside the HMAC signature, a captured delivery resent with a modified `X-Webhook-Id` would still pass signature verification and execute twice if you deduplicated on the header.
- **Attribute orders/deposits/payouts by the business resource ID inside `data`** (`inv_...`, `pcd_...`, `wdr_...`), NOT by `event_id`:
  - Retries and manual replays of one queued delivery keep the same `event_id`.
  - Two endpoints subscribed to the same event receive different `event_id` values for the same business resource.
  - Never deduplicate deliveries on `invoice_id`, or you will drop `invoice.paid` after receiving `invoice.confirming`.

## 3. Exact Closed Set of 18 Webhook Events

Endpoint subscriptions are selected per category (Invoice, Payment channel, Withdrawal); individual event names inside a category are not separately toggled.

### Invoices — 9 Events & 9 Statuses

Exact **9 invoice statuses**: `awaiting_client`, `awaiting_payment`, `confirming`, `underpaid_waiting`, `paid`, `paid_over`, `underpaid`, `expired`, `cancelled`.

Exact **9 invoice events**:
1. `invoice.awaiting_payment` — fired **only** when a deep blockchain reorg invalidates all previously recorded transfers and returns an invoice to `awaiting_payment` (the initial `awaiting_client → awaiting_payment` asset/network selection does **not** emit a webhook)
2. `invoice.confirming` — transfer detected on-chain; **do NOT fulfill**
3. `invoice.paid` — paid in full (or within project's configured `0–2%` underpayment tolerance, default `0.1%`)
4. `invoice.paid_over` — paid above expected amount; full amount is credited to merchant balance
5. `invoice.underpaid_waiting` — partial transfer received below tolerance while window is still open; **do NOT fulfill**
6. `invoice.underpaid` — window closed short of expected amount outside tolerance
7. `invoice.expired` — window closed without sufficient confirmed payment
8. `invoice.cancelled` — invoice cancelled before completion
9. `invoice.paid_late` — **NOTE-ONLY event**: fired at most once when off-invoice credits on a closed `expired`/`underpaid` invoice reach the expected amount in the invoice's token within saved tolerance. `data.status` remains `expired`/`underpaid`, `data.is_final` remains `true`, and `data.paid_late_at` (Unix seconds, omitted when absent) is populated. **Log an order note for merchant review—never auto-fulfill or reopen the order automatically.**

**Fulfillment & Reverse-Verification Rule:**
- Never fulfill an order on `invoice.confirming`, `invoice.underpaid_waiting`, or a browser return URL alone.
- Before fulfilling, reverse-verify via `GET /v1/invoices/{id}` and assert project, environment, currency, expected amount, and terminal paid state (`paid` or `paid_over`).
- Note on Production AML holds: if a Production incoming transfer fails automated AML screening, the payment is held (`Held for review`), the invoice stays `confirming` until deadline, nothing is credited, and **no `invoice.paid` webhook is emitted**.

### Payment Channels — 3 Events

1. `payment_channel.deposit.confirming` — unconfirmed on-chain deposit; **do NOT credit**
2. `payment_channel.deposit.confirmed` — credit the customer's balance **only when `status === "confirmed"` and `is_final === true`**
3. `payment_channel.deposit.reorged` — unconfirmed deposit invalidated by reorg; **do NOT credit**

Reconcile missed events by polling `GET /v1/payment-channel-deposits` (save `next_cursor` on every page including empty pages; cursor TTL is 24 hours; inspect `blocked` if the feed stalls).

### Withdrawals — 6 Events & 7 Statuses

Exact **7 withdrawal statuses**: `created`, `signed`, `completed`, `failed`, `cancelled`, `pending_review`, `cancelling` (`is_final: true` only for `completed`, `failed`, `cancelled`).

Exact **6 withdrawal events**:
1. `withdrawal.created`
2. `withdrawal.processing`
3. `withdrawal.completed`
4. `withdrawal.failed` (full reserved `amount + fee` returned to available balance)
5. `withdrawal.cancelled` (full reserved `amount + fee` returned to available balance)
6. `withdrawal.completion_rewound` — a chain reorg removed a previously completed payout tx; status returns to `signed`, `completed_at` is cleared, and a subsequent `withdrawal.completed` or `withdrawal.failed` settles it.

## 4. Delivery Mechanics, Timeouts, and Endpoint Constraints

- **Endpoint requirements**: HTTPS only, port `443` or `1024–65535`, public host only (SSRF protection validates and pins the resolved IP; HTTP redirects are never followed).
- **10-second timeout per attempt**: return `2xx` fast and run heavy downstream work asynchronously.
- **Retry schedule**: **11 total attempts** (1 initial + 10 retries: 1m, 2m, 4m, 8m, 16m, 32m, 1h, 2h, 4h, 8h — ~16 hours total).
- **No auto-disable & manual replay**: Paymos never automatically disables a failing endpoint, and webhook event records are never purged. Replay failed deliveries from the dashboard or via `merchant_replay_webhook_event`.
- **Limits & scoping**: Up to 10 endpoints per merchant environment. One shared project filter restricts both Invoice and Payment channel categories; Withdrawal events are merchant-level and ignore project filters.
- **Secret rotation**: Rotating a webhook secret opens a 24-hour dual-`v1=` window (or an immediate rotation without grace period from the dashboard if leaked).
