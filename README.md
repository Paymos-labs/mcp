# @paymos/mcp

[![Paymos MCP server](https://glama.ai/mcp/servers/Paymos-labs/mcp/badge)](https://glama.ai/mcp/servers/Paymos-labs/mcp)

Official Paymos MCP server and multi-AI plugin wrapper: install Paymos natively into Claude Code, OpenAI Codex, Antigravity, Gemini CLI, GitHub Copilot CLI, Cursor, or any Agent Skills client from `Paymos-labs/mcp` over remote Streamable HTTP OAuth 2.1 (`188` merchant workspace and Sandbox tools, no local Node.js required) — or run the local `@paymos/mcp` CLI/stdio bridge for offline docs, integration advisor, `.env`/file helpers (`191` tools total in `connect`), or key-based Local Sandbox (`--sandbox`).

## Install as an AI plugin (recommended — no Node.js required)

Native plugins connect directly to `https://app.paymos.io/connect/merchant-mcp` with automatic OAuth 2.1 PKCE + Dynamic Client Registration (`188` workspace & Sandbox tools) and bundle 4 cross-platform Paymos Agent Skills plus guardrails:

| Client | Install command | Notes |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos` | In interactive sessions, `/plugin marketplace add Paymos-labs/mcp` and `/plugin install paymos@paymos` also work. |
| **OpenAI Codex** | `codex plugin marketplace add Paymos-labs/mcp` | Registers the marketplace from GitHub; then select **Paymos** in `/plugins`. |
| **Antigravity** | `agy plugin install https://github.com/Paymos-labs/mcp.git` | Automatically picks up `plugin.json`, `mcp_config.json`, `rules/AGENTS.md`, and `skills/`. |
| **Gemini CLI** | `gemini extensions install https://github.com/Paymos-labs/mcp` | Uses `gemini-extension.json` (`httpUrl` + `oauth.enabled`) and `rules/AGENTS.md`. |
| **GitHub Copilot CLI** | `copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos` | Registers `.github/plugin/marketplace.json` and installs `paymos@paymos`. |
| **Agent Skills (30+ AI tools)** | `npx skills add Paymos-labs/mcp` | Installs all 4 Paymos skills into Cursor, Windsurf, OpenCode, Cline, Roo Code, Zed, and other Agent Skills clients; pair with `npx -y @paymos/mcp setup` for MCP tools. |
| **Cursor** | `.cursor-plugin/plugin.json` + `mcp.json` + `rules/paymos.mdc` + `skills/`, or `npx -y @paymos/mcp setup --client cursor` + `npx skills add Paymos-labs/mcp` | Native Cursor plugin manifests live at the repository root alongside CLI setup and Agent Skills support. |

### Included Paymos Agent Skills (`skills/`)

| Skill | What it covers |
|---|---|
| `paymos-integrate` | Choosing and implementing Paymos integrations (12 official CMS plugins, Low-Code JS widget `/v1/paymos-widget.js` with explicit `PaymosWidget.mount()`, browser POS terminal, Hosted Checkout, Host-to-Host `confirm-payment`, Telegram Bot checkout, Payment Channels, 8 server SDKs), exact asset/network rules (4 stablecoins `USDT`/`USDC`/`USD1`/`DAI` + gold-backed `XAUT`, 13 deposit / 11 withdrawal networks, 45 fiat currencies), and zero-secret `.env` writes via `install-secret`. |
| `paymos-webhooks` | Raw-body `X-Webhook-Signature` HMAC-SHA256 verification (dual `v1=` 24-hour rotation windows, `300` s tolerance), `event_id` deduplication (never `X-Webhook-Id`), all 18 events (9 invoice including note-only `invoice.paid_late`, 3 payment channel, 6 withdrawal), reverse verification via `GET /v1/invoices/{id}`, and `confirmed` + `is_final: true` finality. |
| `paymos-sandbox` | End-to-end Sandbox simulation over MCP (`paid`, `overpaid`, `underpay`, `cancel`, `paid_late`; `confirming`, `reorged`, `confirmed` channel deposits; refunds and withdrawals) with strict Sandbox/Production isolation. |
| `paymos-workspace` | Operating a Paymos merchant workspace over Merchant MCP: role baselines (`Owner`/`Admin`/`Finance`/`Developer`/`Custom`), mandatory verbatim `continue_url` handoff and `operation_id` retry on `user_action_required`, `otk_*`/`ftk_*` local helpers, and dashboard-only withdrawal whitelist rules. |

> Need offline `paymos://docs/*` pages (`27` compiled docs), offline advisor/webhook tools before login, local `.env`/file helpers (`install-secret`, `download-file`, `upload-file`), or key-based Local Sandbox (`--sandbox`)? Use the `@paymos/mcp` CLI setup below (requires Node.js 22.12+).

## Quick setup (CLI bridge & offline docs)

Configure any supported AI IDE or CLI with one command and no API keys:

```bash
npx -y @paymos/mcp setup
```

`setup` requires **Node.js 22.12 or later** and runs a zero-key setup-first flow:

1. Automatically detects installed MCP clients (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop`, and project `.vscode`), or asks in an interactive terminal if none are detected (`claude-code` and `codex` fallback in non-interactive terminals).
2. Writes the local stdio bridge (`@paymos/mcp connect`) configuration first, preserving other servers and comments. If a local Sandbox entry already occupies `paymos`, Merchant MCP is configured side-by-side as `paymos-merchant`.
3. Optionally offers browser OAuth 2.1 PKCE `S256` sign-in (`[Y/n]`, scopes `merchant:mcp` and `offline_access`).
   - **Decline (`n`), pass `--no-login`, or run non-interactively:** `setup` exits `0` and leaves Paymos ready in **offline reference & integration-advisor mode** (`27` compiled `paymos://docs/*` resources + `paymos_auth_status`, `recommend_payment_integration`, and `verify_webhook_signature` with zero network calls or browser popups).
   - **Accept (`Y` / Enter):** opens your browser to approve access and stores OAuth tokens under OS-protected permissions outside IDE configs (`%APPDATA%\Paymos\mcp\merchant-oauth.json` on Windows, `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json` on Unix). Even if browser sign-in is cancelled or fails, your IDE configuration remains saved for offline reference mode.

Dashboard → Developers → Agents shows active connections, activity, recent operations, and Disconnect.

### Supported clients and examples

```bash
npx -y @paymos/mcp setup
npx -y @paymos/mcp setup --client antigravity
npx -y @paymos/mcp setup --client glm
npx -y @paymos/mcp setup --client codex
npx -y @paymos/mcp setup --client claude-code
npx -y @paymos/mcp setup --client antigravity --no-login
```

| Client | `--client` value | Default configuration |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/config.toml` or `~/.codex/config.toml` |
| Claude Code | `claude-code` | `~/.claude.json` |
| Claude Desktop | `claude-desktop` | Claude's macOS or Windows configuration |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` |
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` or `~/.kimi-code/mcp.json` |
| ZCode / GLM | `zcode` (alias `glm`) | `~/.zcode/cli/config.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `opencode` | `OPENCODE_CONFIG`, or the user configuration under `$XDG_CONFIG_HOME/opencode` or `~/.config/opencode` |
| VS Code | `vscode` | `.vscode/mcp.json` in the current directory |
| Another client | `generic` | Explicit `--config PATH` required |

For OpenCode, setup uses an existing `opencode.jsonc` before `opencode.json`. To use a different configuration for any client, pass `--config PATH`. Claude Desktop on other operating systems needs an explicit path. Cline, Roo Code, and custom clients can use `--client generic --config PATH` with the MCP configuration path shown by that client.

To preview proposed changes without modifying files or signing in:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Kimi CLI is a client, distinct from the Kimi model. GLM, Kimi, and custom models can use Paymos through an MCP client if both the client and chosen model support tool calling. Setup does not change your model. For example, [Z.ai explains how to run GLM in Claude Code](https://docs.z.ai/devpack/tool/claude); add Paymos using the Claude Code adapter after configuring the model.

### `setup` options

- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (or alias `glm`), `cursor`, `windsurf`, `opencode`, `vscode`, or `generic`
- `--config PATH`: explicit client configuration path (required for `generic`)
- `--origin URL`: custom Paymos origin (`https://...` or loopback `http://127.0.0.1` / `http://localhost`, default `https://app.paymos.io`)
- `--token-file PATH`: custom OAuth token store path
- `--no-login`: write client configurations without offering browser OAuth sign-in
- `--sandbox`: activate key-based Local Sandbox setup (`credentials.json`); cannot be combined with `--origin`, `--token-file`, or `--no-login`
- `--credentials-file PATH`: separate file for Sandbox test credentials (implies `--sandbox`)
- `--dry-run`: preview target files without signing in or writing
- `--help`, `-h`: show command usage

You can also run `npx -y @paymos/mcp auth` directly to sign in immediately via browser OAuth and configure clients (supporting `--client`, `--config`, `--origin`, `--token-file`, `--no-login`, and `--dry-run`).

### Local OAuth bridge (`connect`)

Configured clients launch `npx -y @paymos/mcp connect` (or `cmd /d /c npx -y @paymos/mcp connect` on Windows). `connect`:

- Sends `instructions` on `initialize`, serves all `27` compiled `paymos://docs/*` pages locally on `resources/list` and `resources/read`, and exposes `191` tools (`3` local offline tools + `188` merchant account and Sandbox tools) on `tools/list` without blocking IDE startup.
- Executes `paymos_auth_status`, `recommend_payment_integration`, and `verify_webhook_signature` 100% locally with zero network calls and zero browser popups.
- Triggers browser OAuth PKCE `S256` lazily only when calling an account or Sandbox API tool (`get_connection_status`, `merchant_*`, `playground_*`) without a valid session, and transparently refreshes expired access tokens.

### Direct URL connectors (cloud / native OAuth clients)

Clients that connect directly over Streamable HTTP OAuth 2.1 + DCR can use:

- URL `https://app.paymos.io/connect/merchant-mcp`
- OAuth scopes `merchant:mcp` and `offline_access`

### Key and file delivery

The merchant tools can create and rotate Payment and Payout credentials under the merchant’s access policy. The tools return a short-lived installer ticket. The installer uses a verifier generated on the destination machine to exchange the ticket and save the credentials into the chosen environment file.

```bash
paymos install-secret --prepare --file .env --merchant-id "$PAYMOS_MERCHANT_ID" --environment production --operation-id "$PAYMOS_OPERATION_ID"
paymos install-secret --file .env --request-id "$PAYMOS_REQUEST_ID" --token "$PAYMOS_INSTALLER_TICKET"
```

Pass the first command’s `request_id` and `challenge` as the tool’s `delivery` input with the same merchant, environment and operation ID. Run the second command on the same machine with the returned ticket. For private exports and staged logo or avatar uploads, the `download-file` and `upload-file` helpers use the same prepare-and-redeem flow with `--file`. Upload preparation also supplies the file size, content type and hash.

Withdrawals follow the merchant’s current policy and native approval rules. Manage withdrawal whitelist addresses from the dashboard.

## Local Sandbox (`--sandbox`)

If you prefer a key-based local stdio server exclusively for Sandbox API calls, pass `--sandbox` (or `--credentials-file` / `PAYMOS_API_*` environment variables). It provides `15` tools (`recommend_payment_integration`, `verify_webhook_signature`, and `13` Sandbox invoice/payment-channel tools) plus `5` documentation resources, signing API requests with a test Payment key pair (`pk_test_…` and `sk_test_…`) via `@paymos/sdk`.

### Requirements

- Node.js 22.12 or later
- A Paymos merchant account with a test key pair from Dashboard → Developer → API Keys (`pk_test_…` and `sk_test_…`)
- An MCP client that can launch a local stdio server

### Setup the local Sandbox server

Run:

```bash
npx -y @paymos/mcp setup --sandbox
```

Or specify the client directly:

```bash
npx -y @paymos/mcp setup --sandbox --client codex
```

Choose your client and enter your test key pair. Secret input is hidden. You can also supply a webhook secret for signature verification or press Enter to skip it. If the values are already in your environment, setup reads `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET`, and optional `PAYMOS_WEBHOOK_SECRET`.

Setup saves credentials separately, by default in `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` or `~/.config/paymos/mcp/credentials.json` when `XDG_CONFIG_HOME` is unset. Use `--credentials-file PATH` to choose another location outside your project. The client entry contains only `PAYMOS_CREDENTIALS_FILE` with that path; it does not contain your keys. Keep the credentials file out of version control.

To preview the proposed Sandbox changes, run:

```bash
npx -y @paymos/mcp setup --sandbox --client codex --dry-run
```

Dry-run writes no files and prints no secrets. Repeating setup with the same data does not add a duplicate entry. If existing Paymos settings or credentials differ, setup refuses to overwrite them so you can review the conflict. Other servers, comments, models, and client settings are preserved. An older Paymos entry with inline key environment variables also causes a conflict; setup does not migrate it automatically.

Restart or reconnect your MCP client after setup, then look for Paymos in its server list. Use `npx -y @paymos/mcp setup --help` for the full option list. Without an interactive terminal, `--sandbox` requires `--client` and the required key environment variables (`PAYMOS_API_KEY_ID` and `PAYMOS_API_SECRET`).

## Manual configuration

For zero-key OAuth bridge mode (`connect`), configure your client to run `npx -y @paymos/mcp connect` (no `PAYMOS_CREDENTIALS_FILE` needed). For key-based Local Sandbox (`--sandbox`), first create a credentials file outside the project:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` is optional. On Unix, run `chmod 600 /absolute/path/credentials.json` after saving, using the actual absolute path. On Windows, keep the file in your account directory and check its existing access permissions. In the examples below, replace `/absolute/path/credentials.json` with the file's absolute path (or omit `env` and append `"connect"` to `args` for OAuth bridge mode), and preserve your existing client settings.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf, and generic clients

```json
{
  "mcpServers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

For `--sandbox` mode with a credentials file, pass `"args": ["-y", "@paymos/mcp"]` and `"env": { "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json" }`.

Use the locations in the setup table. Claude Code also accepts a project `.mcp.json`. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Cline and Roo Code show their configuration through MCP Servers → Configure.

### Codex

Add to `config.toml`:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp", "connect"]
```

For `--sandbox` mode:

```toml
[mcp_servers.paymos]
command = "npx"
args = ["-y", "@paymos/mcp"]

[mcp_servers.paymos.env]
PAYMOS_CREDENTIALS_FILE = "/absolute/path/credentials.json"
```

### OpenCode

```json
{
  "mcp": {
    "paymos": {
      "type": "local",
      "command": ["npx", "-y", "@paymos/mcp", "connect"],
      "enabled": true
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` or your user MCP configuration:

```json
{
  "servers": {
    "paymos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

### Zed

Zed requires manual configuration; setup has no Zed adapter. On Unix, use `~/.config/zed/settings.json` for global settings or `.zed/settings.json` for project settings. On Windows, open settings in Zed to find the actual `settings.json` file. Add:

```json
{
  "context_servers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp", "connect"]
    }
  }
}
```

### Windows

For each manual example, use this launcher on Windows:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]
```

OpenCode uses a single array: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp", "connect"]`. For Codex TOML, set `command = "cmd"` and use the same argument array. Setup selects the Windows launcher automatically.

### Existing credential options

In `--sandbox` mode, the server still reads `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET`, and optional `PAYMOS_WEBHOOK_SECRET` directly. The `--api-key-id` and `--api-secret` flags also remain available. Environment values take priority over flags, which take priority over fields in the credentials file. Avoid putting secrets in command history or tracked configuration.

## Tools

### Local offline tools in `connect` (`3` offline + `188` merchant tools = `191` total)

| Tool | Purpose |
|---|---|
| `paymos_auth_status` | Read local Paymos OAuth sign-in state (`active`, `refreshable`, `none`) and active origin with zero network calls or browser launch |
| `recommend_payment_integration` | Offline integration advisor covering `cms_plugin` (12 official CMS plugins), `checkout_widget`, `pos_terminal`, `order_checkout`, `repeat_deposits`, `both`, and `unsure`, plus SDKs, supported networks/assets, and webhook rules |
| `verify_webhook_signature` | Verify `X-Webhook-Signature` against the raw webhook body locally using `@paymos/sdk` (supports dual-`v1=` secret rotation; uses `secret` or `PAYMOS_WEBHOOK_SECRET`) |

When signed in (or on first call after lazy OAuth), `connect` also exposes `188` merchant account and Sandbox tools (`get_connection_status`, `merchant_*`, `playground_*`).

### Local Sandbox (`--sandbox`) tools (`15` total)

| Tool | Purpose |
|---|---|
| `recommend_payment_integration` | Recommend invoices, payment channels, or both from the merchant’s payment flow. Explain the fit and relevant lifecycle. When information is missing, return a targeted question instead of choosing. Respect an explicit merchant choice. |
| `create_invoice` | Create a sandbox invoice; idempotent per `external_order_id`; returns `payment_url` |
| `get_invoice` | Fetch the current invoice state |
| `list_invoices` | Fetch one cursor page of invoices, with filters |
| `cancel_invoice` | Cancel an unpaid invoice and store the reason |
| `simulate_invoice_payment` | Simulate `paid`, `paid_late`, `overpaid`, `underpay`, or `cancel` in the sandbox |
| `verify_webhook_signature` | Verify `X-Webhook-Signature` against the raw webhook body locally |
| `create_payment_channel` | Create a channel; idempotent per `project_id` and `external_id` |
| `get_payment_channel` | Read a channel's current status and available deposit addresses |
| `list_payment_channels` | List one page of channels with filters and a cursor |
| `block_payment_channel` | Set a payment channel's status to blocked |
| `unblock_payment_channel` | Clear a payment channel's blocked status |
| `simulate_payment_channel_deposit` | Simulate a new `confirming`, `reorged`, or `confirmed` deposit |
| `get_payment_channel_deposit` | Read a deposit at any stage |
| `list_payment_channel_deposits` | Read one page of confirmed deposits, oldest first |

Each `simulate_payment_channel_deposit` call creates a new test deposit. The deposit feed returns only confirmed deposits. Save `next_cursor` from every response, including empty pages, and use it for the next poll. If the feed stops advancing, check `blocked` for the deposit and reason.

A deposit-feed cursor is valid for 24 hours; keep `confirmed_from` unchanged when continuing with that cursor.

`paid_late` is a simulation scenario, not an invoice status. See the [sandbox documentation](https://paymos.io/docs/testing) for its behavior.

Tool errors use `{ "code": "paymos/<api_error_code>", "message": "…" }`. Sandbox and credential refusals use `paymos/sandbox-only`, `paymos/missing-credentials`, and `paymos/invalid-credentials`.

## Resources

In `connect` mode, `27` documentation pages (`CONNECT_DOC_RESOURCES`) are compiled at build time and served locally via `resources/list` and `resources/read` without network access or OAuth:

- Core & checkout: `paymos://docs/overview`, `paymos://docs/quick-start`, `paymos://docs/payment-flow`, `paymos://docs/hosted-checkout`, `paymos://docs/supported-currencies`, `paymos://docs/widget-sdk`, `paymos://docs/widget-terminal`, `paymos://docs/server-sdks`, `paymos://docs/api-keys`, `paymos://docs/webhooks`, `paymos://docs/webhooks-verify`, `paymos://docs/testing-sandbox`, `paymos://docs/payment-channels-create`, `paymos://docs/payment-channel-deposits-list`, `paymos://docs/errors`
- Official CMS plugins (`12`): `paymos://docs/cms-woocommerce`, `paymos://docs/cms-whmcs`, `paymos://docs/cms-prestashop`, `paymos://docs/cms-magento2`, `paymos://docs/cms-opencart`, `paymos://docs/cms-shopware6`, `paymos://docs/cms-cscart`, `paymos://docs/cms-easy-digital-downloads`, `paymos://docs/cms-drupal-commerce`, `paymos://docs/cms-hikashop`, `paymos://docs/cms-givewp`, `paymos://docs/cms-odoo`

In `--sandbox` mode, five documentation pages (`DOC_RESOURCES`) remain available inside the MCP session:

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Sandbox and credentials

The server opens no network listener (outside the temporary loopback callback during browser OAuth) and calls the Merchant API through `@paymos/sdk` in `--sandbox` mode. Setup output does not print secret values. Check your chosen client and model provider's logging settings separately. Setup stores OAuth tokens and Sandbox keys in separate local files; on Unix, new credential and token files use mode `0600` in a private directory. On Windows, access follows the account directory's permissions; the file is not encrypted by setup.

In `--sandbox` mode, live (`pk_live_`/`sk_live_`) and payout (`rk_…`) keys are rejected during setup, at server startup, and on tool calls. After checking your integration in the sandbox, run your own application with its live keys. The `--sandbox` server stays outside production payment paths.

## Frequently Asked Questions

### How does Paymos MCP work without exposing API keys to the LLM?
Native AI plugins (Claude Code, OpenAI Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot CLI) connect over remote Streamable HTTP to `https://app.paymos.io/connect/merchant-mcp` using OAuth 2.1 PKCE — no raw API keys are stored in prompts or IDE config files. In local CLI mode (`npx -y @paymos/mcp setup`), OAuth tokens live under OS-protected user directories outside workspace configs, and `install-secret` writes merchant keys directly into `.env` without echoing them into LLM context.

### What cryptocurrencies and networks does Paymos support?
Paymos supports **5 assets** — four stablecoins (**USDT, USDC, USD1, DAI**) and one gold-backed asset (**XAUT**) — across **13 mainnet networks** for incoming payments (`TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA`) and **11 networks** for withdrawals (`NEAR` and `Sui` are deposit-only). Settlement stays in the accepted asset with **1.0%** standard incoming fee and **0%** Paymos withdrawal commission (network fees only).

### Can an AI agent move live funds or bypass payout whitelists?
No. Merchant MCP enforces the authenticated user's exact Paymos role (`Owner`, `Admin`, `Finance`, `Developer`, `Custom`). Sensitive Production actions return `user_action_required` with a dashboard `continue_url` for explicit human step-up confirmation, and the withdrawal address whitelist is enabled by default and managed in the dashboard.

### What is the difference between 188 remote tools and 191 CLI tools?
Direct remote HTTP connections (`https://app.paymos.io/connect/merchant-mcp`) expose **188** server workspace and Sandbox tools (`162` `merchant_*`, `25` `playground_*`, and `get_connection_status`). Running the local `@paymos/mcp connect` stdio wrapper adds **3** zero-network offline helpers (`paymos_auth_status`, `recommend_payment_integration`, `verify_webhook_signature`) plus `27` compiled `paymos://docs/*` pages, for **191** tools total.

Full documentation: [Paymos MCP & AI Agents Guide](https://paymos.io/docs/mcp) · [AI Agents Product Page](https://paymos.io/product/ai-agents)

## Development

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

License: MIT — see [LICENSE](LICENSE).
