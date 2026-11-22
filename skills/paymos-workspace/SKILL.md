---
name: paymos-workspace
description: Operate a Paymos merchant workspace safely over remote Merchant MCP — checking roles and environments, handling user_action_required continue_url and operation_id handoffs, running otk_*/ftk_* local helpers, and respecting dashboard-only withdrawal whitelist boundaries.
---

# Paymos Merchant Workspace MCP Guide

Use this skill whenever inspecting or mutating a merchant's Paymos workspace through Merchant MCP (`https://app.paymos.io/connect/merchant-mcp`, OAuth 2.1 PKCE `S256` + DCR, scopes `merchant:mcp` and `offline_access`).

## 1. Verify Connection, Environment, and Role First

1. Call `get_connection_status` (or local `paymos_auth_status` when connected through `@paymos/mcp connect`) to inspect:
   - Signed-in merchant identity and team role.
   - Granted environments (`Sandbox`, `Live`, or both) chosen on the OAuth consent screen.
2. **Confirm before Live mutations**: before creating/rotating Live credentials, creating Live withdrawals/refunds, changing Live webhooks, or modifying team memberships, confirm the target environment (`"Production"` vs `"Sandbox"` in PascalCase for MCP tool `environment` inputs; lowercase `--environment production|sandbox` for `@paymos/mcp` CLI helpers) and parameters with the user.
3. **No separate agent API keys**: MCP runs under the signed-in team member's permissions and consent scope. Connections can be monitored or revoked anytime under **Dashboard → Developer → Agents** (`/developers/agents`) without affecting store `pk_`/`rk_` API keys.
4. **Production traffic boundary**: Production apps must call the Merchant API directly via an official server SDK—do not route live shopper checkout through an AI agent.

## 2. Respect Merchant Team Role Baselines

Paymos has exactly **5 merchant roles**: `Owner`, `Admin`, `Finance`, `Developer`, and `Custom`.

| Role | Key Baseline Boundaries (Before Explicit Extra Grants) |
|---|---|
| `Owner` | Full account control; **only baseline role** with `ManageWhitelist`, ownership actions, and whitelist opt-out requests |
| `Admin` | Operational management and team invites within own permissions; **view-only on withdrawals by default** (no `Withdraw`, no `ManageWhitelist`) |
| `Finance` | Balances, payouts (`Withdraw`), and financial operations; **cannot add whitelist entries by default** |
| `Developer` | Projects, API keys, webhooks, Sandbox testing, integration tooling |
| `Custom` | Zero default baseline; strictly the explicitly granted permissions |

Permissions may be expanded or restricted per member by the Owner, so always handle authorization denials gracefully instead of assuming a role's capabilities.

## 3. Mandatory `user_action_required` / `continue_url` / `operation_id` Protocol

Browser OAuth login and sensitive Live actions (secret rotation, withdrawals, IP allowlist edits, team changes when TOTP or WebAuthn passkey step-up is enrolled) return `status: "user_action_required"` with a `continue_url` (and `operation_id` when resuming a pending operation).

**You MUST follow all three rules every time:**
1. **Always print the full clickable `continue_url` verbatim in chat**—never hide, shorten, or paraphrase it, even when a local bridge also opens the default browser (the user may need a different browser or logged-in profile).
2. **Wait for the user** to complete the browser confirmation (OAuth consent or 2FA TOTP / passkey step-up).
3. **Retry the exact tool call reusing the exact same `operation_id`** when present, so the server binds the completed confirmation to the original operation instead of starting a new one.

## 4. Zero-Secret & Binary File Delivery Helpers (`otk_*` / `ftk_*`)

Raw API secrets (`sk_...`), webhook secrets (`whsec_...`), CSV exports, and binary images never enter LLM chat context. Pair the MCP tool call with the local `@paymos/mcp` CLI helper on the user's machine:

### Credentials & Webhook Secrets (`otk_*` tickets)
```bash
# 1. Prepare local verifier & challenge bound to .env, merchant, environment, and operation_id
npx -y @paymos/mcp install-secret --prepare \
  --file .env \
  --merchant-id "$PAYMOS_MERCHANT_ID" \
  --environment production \
  --operation-id "$PAYMOS_OPERATION_ID"

# 2. Pass request_id + challenge in the MCP tool's `delivery` input (create/rotate/reveal credential or webhook secret)

# 3. Redeem the returned single-use otk_... ticket on the same machine
npx -y @paymos/mcp install-secret \
  --file .env \
  --request-id "$PAYMOS_REQUEST_ID" \
  --token "$PAYMOS_INSTALLER_TICKET"
```

### Private Exports & Terminal QR Downloads (`ftk_*` tickets)
```bash
npx -y @paymos/mcp download-file --prepare \
  --file ./export.csv \
  --merchant-id "$PAYMOS_MERCHANT_ID" \
  --environment production \
  --operation-id "$PAYMOS_OPERATION_ID"

# Pass request_id + challenge in the export/QR MCP tool's `delivery` input, then redeem:
npx -y @paymos/mcp download-file \
  --file ./export.csv \
  --request-id "$PAYMOS_REQUEST_ID" \
  --token "$PAYMOS_FILE_TICKET"
```

### Project Logo & Avatar Uploads (`ftk_*` tickets)
- Accepted image formats: **PNG, JPEG, or WebP up to 2 MB** (**SVG is not accepted** for project logos).
```bash
npx -y @paymos/mcp upload-file --prepare \
  --file ./logo.png \
  --merchant-id "$PAYMOS_MERCHANT_ID" \
  --environment production \
  --operation-id "$PAYMOS_OPERATION_ID"

# Pass `request_id` and `challenge` in `delivery` and `content_type`, `byte_length`, `content_sha256` at top-level `input` on `merchant_upload_project_logo` / `merchant_upload_user_avatar`, upload the staged bytes via CLI, then call the same MCP tool again with `file_ticket` to finalize:
npx -y @paymos/mcp upload-file \
  --file ./logo.png \
  --request-id "$PAYMOS_REQUEST_ID" \
  --token "$PAYMOS_FILE_TICKET"
```

## 5. Withdrawal Whitelist & Payout Guardrails

- **Adding withdrawal whitelist addresses is Dashboard-only**: neither the Merchant API nor Merchant MCP can add new whitelisted withdrawal addresses. Direct the `Owner` to **Dashboard → Balance → Withdrawal addresses** (manual add or CSV import up to 1,000 rows per step-up, max 5,000 active addresses).
- **Network groups, not individual networks**: Whitelist entries are keyed by `(merchant, address, network_group)` across 4 groups—`EVM` (covers all 8 EVM payout networks: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Plasma), `Tron`, `TON`, and `Solana`.
- **11 payout networks only**: **NEAR** and **SUI** are **deposit-only** and cannot be withdrawn to (even if the whitelist is turned off).
- **Whitelist opt-out boundary**: The whitelist is enabled by default; only the `Owner` can request turning it off through Paymos support with operator approval (and any active Production Payout `rk_` key must have a non-empty IP allowlist).
- **Production AML & refunds of failed payouts**: Every Production withdrawal recipient address is screened fresh automatically before routing. If a payout fails or is cancelled before going on-chain, 100% of `amount + fee` returns to the available balance.
- **Reversibility note**: Archiving a **project** is reversible (`merchant_restore_project`); archiving a **widget price** (`merchant_archive_widget_price`) is permanent.
