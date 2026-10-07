# @paymos/mcp

The official Paymos MCP server. A local stdio server: your coding agent — Claude
Code, Cursor, or your own LLM bot — builds and verifies a Paymos merchant integration
in minutes. It creates sandbox invoices, opens the payment URL, simulates payment,
watches the status turn `paid`, verifies webhook signatures, then writes the
production integration around `@paymos/sdk` for you. No docs to read, no skeleton code
to copy.

Sandbox only in v1: the server accepts test key pairs (`pk_test_` / `sk_test_`) and
refuses live and payout keys with a clear error. Live operation arrives with the
hosted `mcp.paymos.io` (phase 2).

## Requirements

- Node.js ≥ 20
- A Paymos merchant account with a test key pair: **Dashboard → Developers → API
  keys**

## Install

Nothing to install globally — run it through `npx` from your MCP client config.

## Configure

Credentials come from the environment (the `--api-key-id` / `--api-secret` flags also
work; the environment wins on conflict):

| Env | Meaning |
|---|---|
| `PAYMOS_API_KEY_ID` | Test key id, `pk_test_…` |
| `PAYMOS_API_SECRET` | Test secret, `sk_test_…` |
| `PAYMOS_WEBHOOK_SECRET` | Optional `whsec_…` for `verify_webhook_signature` |

### Claude Code

```json
{
  "mcpServers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_API_KEY_ID": "pk_test_…",
        "PAYMOS_API_SECRET": "sk_test_…",
        "PAYMOS_WEBHOOK_SECRET": "whsec_…"
      }
    }
  }
}
```

### Claude Desktop

Same `mcpServers` block in `claude_desktop_config.json` — Claude → Settings →
Developer → Edit Config (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`, Windows:
`%APPDATA%\Claude\claude_desktop_config.json`).

### Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project) uses the same shape:

```json
{
  "mcpServers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_API_KEY_ID": "pk_test_…",
        "PAYMOS_API_SECRET": "sk_test_…"
      }
    }
  }
}
```

### Windsurf

Same `mcpServers` block in `~/.codeium/windsurf/mcp_config.json`.

### Cline / Roo Code

Same `mcpServers` block in `cline_mcp_settings.json` for Cline and
`roo_mcp_settings.json` for Roo Code (MCP Servers → Configure in the extension).

### VS Code (Copilot)

`.vscode/mcp.json` (or the user-level `mcp.json`) wraps the entry in `servers`
with an explicit transport type:

```json
{
  "servers": {
    "paymos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_API_KEY_ID": "pk_test_…",
        "PAYMOS_API_SECRET": "sk_test_…"
      }
    }
  }
}
```

### Zed

`~/.zed/settings.json`, same fields under `context_servers`:

```json
{
  "context_servers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_API_KEY_ID": "pk_test_…",
        "PAYMOS_API_SECRET": "sk_test_…"
      }
    }
  }
}
```

### GLM (Z.ai)

GLM Coding Plan plugs into Claude Code as its model backend (see the Z.ai docs
for the Claude Code endpoint setup). Once Claude Code runs on GLM, add the
`paymos` server with the Claude Code config above — the MCP layer is identical.

### ChatGPT

The ChatGPT app and web chat cannot launch local stdio servers; they talk to
remote MCP servers over HTTP. The hosted `mcp.paymos.io` (phase 2) will cover
ChatGPT and other hosted clients. Developers building on the OpenAI Agents SDK
can mount this stdio server in their own agent code today.

### Generic MCP client

Any client that speaks MCP over stdio: command `npx`, args `["-y", "@paymos/mcp"]`,
env as above.

## Tools (frozen public surface)

Names and schemas are fixed from 1.0.0 — breaking changes mean a new major version.

| Tool | What it does |
|---|---|
| `create_invoice` | Creates a sandbox invoice; idempotent per `external_order_id`; returns `payment_url` |
| `get_invoice` | Fetches the current invoice state |
| `list_invoices` | One cursor page of invoices with filters (status, dates, order id) |
| `cancel_invoice` | Cancels an unpaid invoice with a stored reason |
| `simulate_invoice_payment` | Sandbox only: drives an invoice through `paid` / `overpaid` / `underpay` / `cancel` |
| `verify_webhook_signature` | Locally verifies `X-Webhook-Signature` against a raw webhook body |

Tool errors are `{ "code": "paymos/<api_error_code>", "message": "…" }`; the gate
refusals use `paymos/sandbox-only`, `paymos/missing-credentials` and
`paymos/invalid-credentials`.

## Resources

Five static doc pages are served as MCP resources so the agent never leaves the
session: `paymos://docs/quick-start`, `paymos://docs/hosted-checkout`,
`paymos://docs/webhooks`, `paymos://docs/testing-sandbox`,
`paymos://docs/server-sdks`.

## Security notes

- stdio only: no network listener is opened; the server talks to
  `https://api.paymos.io` exclusively through `@paymos/sdk`.
- The secret never appears in logs, stdout or error text.
- Live (`pk_live_`/`sk_live_`) and payout (`rk_…`) keys are refused at startup and on
  every call: `paymos/sandbox-only`.

## FAQ

**Can my agent move real money?** No. v1 is deliberately sandbox-only. When the agent
has written and verified your integration, your own code goes live with your live keys
— the MCP server stays out of production paths.

**Why does my live key pair fail?** By design. Create a test pair in Dashboard →
Developers → API keys.

**Is there a hosted version?** Phase 2: `mcp.paymos.io` with OAuth 2.1 login, agent
entities with scoped keys, and live operation.

## Development

```bash
npm install          # deps (@paymos/sdk resolves from ../typescript-sdk)
npm run build:resources   # regenerate doc resources from the docs corpus
npm test             # vitest suite incl. the contract-freeze snapshot
npm run build        # tsup bundle to dist/
```

License: MIT — see [LICENSE](LICENSE).
