# @paymos/mcp

Paymos offers a local Sandbox server for integration testing and a hosted MCP connection for your merchant account.

## Connect a merchant account

Connect any supported AI IDE or CLI to your Paymos merchant account with one command and no API keys:

```bash
npx -y @paymos/mcp auth
```

`auth` automatically detects installed clients (`antigravity`, `claude-code`, `codex`, `kimi`, `zcode`/`glm`, `cursor`, `windsurf`, `opencode`, `claude-desktop`, and project `.vscode`), opens Paymos in your browser for OAuth 2.1 PKCE `S256` sign-in (`merchant:mcp` and `offline_access`), saves your OAuth session under OS-protected permissions outside IDE configs (`%APPDATA%\Paymos\mcp\merchant-oauth.json` on Windows, `$XDG_CONFIG_HOME/paymos/mcp/merchant-oauth.json` on Unix), and configures the local stdio OAuth bridge (`@paymos/mcp connect`). If a local Sandbox entry already occupies `paymos`, Merchant MCP is configured side-by-side as `paymos-merchant`.

Dashboard → Developers → Agents shows connection status, activity, recent operations and the Disconnect action.

### Paymos command

```bash
npx -y @paymos/mcp auth
npx -y @paymos/mcp auth --client antigravity
npx -y @paymos/mcp auth --client glm
npx -y @paymos/mcp auth --client codex
npx -y @paymos/mcp auth --client claude-code
```

Options for `auth`:
- `--client NAME`: `codex`, `claude-code`, `claude-desktop`, `antigravity`, `kimi`, `zcode` (or alias `glm`), `cursor`, `windsurf`, `opencode`, `vscode`, or `generic`
- `--config PATH`: explicit client configuration path (required for `generic`)
- `--origin URL`: custom Paymos origin (`https://...` or loopback `http://127.0.0.1` / `http://localhost`, default `https://app.paymos.io`)
- `--token-file PATH`: custom OAuth token store path
- `--no-login`: write client configurations without opening browser login
- `--dry-run`: preview target files without signing in or writing

### Local OAuth bridge (`connect`)

Configured clients launch `npx -y @paymos/mcp connect` (or `cmd /d /c npx -y @paymos/mcp connect` on Windows). `connect` responds to MCP startup requests (`initialize`, `ping`, `tools/list`, `resources/list`, `prompts/list`) locally without blocking IDE startup, triggers browser OAuth lazily on `tools/call` when needed, and transparently refreshes expired access tokens.

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

## Local Sandbox

The local stdio server provides 14 tools and five documentation resources for creating and simulating test invoices, checking invoice states and verifying webhook signatures. It signs API requests with the official SDK using a test Payment key pair.

### Requirements

- Requires Node.js 22.12 or later.
- A Paymos merchant account with a test key pair from Dashboard → Developer → API Keys (`pk_test_…` and `sk_test_…`)
- An MCP client that can launch a local stdio server

### Setup the local server

Run:

```bash
npx -y @paymos/mcp setup
```

Choose your client and enter your test key pair. Secret input is hidden. You can also supply a webhook secret for signature verification or press Enter to skip it. If the values are already in your environment, setup reads `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET`, and optional `PAYMOS_WEBHOOK_SECRET`.

You can select the client in the command:

```bash
npx -y @paymos/mcp setup --client codex
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

Setup saves credentials separately, by default in `$XDG_CONFIG_HOME/paymos/mcp/credentials.json` or `~/.config/paymos/mcp/credentials.json` when `XDG_CONFIG_HOME` is unset. Use `--credentials-file PATH` to choose another location outside your project. The client entry contains only `PAYMOS_CREDENTIALS_FILE` with that path; it does not contain your keys. Keep the credentials file out of version control.

To preview the proposed changes, run:

```bash
npx -y @paymos/mcp setup --client codex --dry-run
```

Dry-run writes no files and prints no secrets. Repeating setup with the same data does not add a duplicate entry. If existing Paymos settings or credentials differ, setup refuses to overwrite them so you can review the conflict. Other servers, comments, models, and client settings are preserved. An older Paymos entry with inline key environment variables also causes a conflict; setup does not migrate it automatically.

Restart or reconnect your MCP client after setup, then look for Paymos in its server list. Try asking the agent to create a sandbox invoice and simulate payment. Use `npx -y @paymos/mcp setup --help` for the full option list. Without an interactive terminal, provide `--client` and the required key environment variables; setup cannot ask for missing values there.

Kimi CLI is a client, distinct from the Kimi model. GLM, Kimi, and custom models can use Paymos through an MCP client if both the client and chosen model support tool calling. Setup does not change your model. For example, [Z.ai explains how to run GLM in Claude Code](https://docs.z.ai/devpack/tool/claude); add Paymos using the Claude Code adapter after configuring the model.

## Manual configuration

Create a credentials file outside the project:

```json
{
  "apiKeyId": "pk_test_…",
  "apiSecret": "sk_test_…",
  "webhookSecret": "whsec_…"
}
```

`webhookSecret` is optional. On Unix, run `chmod 600 /absolute/path/credentials.json` after saving, using the actual absolute path. On Windows, keep the file in your account directory and check its existing access permissions. In the examples below, replace `/absolute/path/credentials.json` with the file's absolute path, and preserve your existing client settings.

### Claude Code, Claude Desktop, Kimi CLI, Cursor, Windsurf, and generic clients

```json
{
  "mcpServers": {
    "paymos": {
      "command": "npx",
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json"
      }
    }
  }
}
```

Use the locations in the setup table. Claude Code also accepts a project `.mcp.json`. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Cline and Roo Code show their configuration through MCP Servers → Configure.

### Codex

Add to `config.toml`:

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
      "command": ["npx", "-y", "@paymos/mcp"],
      "environment": {
        "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json"
      },
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
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json"
      }
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
      "args": ["-y", "@paymos/mcp"],
      "env": {
        "PAYMOS_CREDENTIALS_FILE": "/absolute/path/credentials.json"
      }
    }
  }
}
```

### Windows

For each manual example, use this launcher on Windows:

```json
"command": "cmd",
"args": ["/d", "/c", "npx", "-y", "@paymos/mcp"]
```

OpenCode uses a single array: `"command": ["cmd", "/d", "/c", "npx", "-y", "@paymos/mcp"]`. For Codex TOML, set `command = "cmd"` and use the same argument array. Setup selects the Windows launcher automatically.

### Existing credential options

The server still reads `PAYMOS_API_KEY_ID`, `PAYMOS_API_SECRET`, and optional `PAYMOS_WEBHOOK_SECRET` directly. The `--api-key-id` and `--api-secret` flags also remain available. Environment values take priority over flags, which take priority over fields in the credentials file. Avoid putting secrets in command history or tracked configuration.

## Tools



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

Five documentation pages are available inside the MCP session:

- `paymos://docs/quick-start`
- `paymos://docs/hosted-checkout`
- `paymos://docs/webhooks`
- `paymos://docs/testing-sandbox`
- `paymos://docs/server-sdks`

## Sandbox and credentials

The server opens no network listener and calls the Merchant API through `@paymos/sdk`. Setup output does not print secret values. Check your chosen client and model provider's logging settings separately. Setup stores keys in a separate local file; on Unix, new credential files use mode `0600` in a private directory. On Windows, access follows the account directory's permissions; the file is not encrypted by setup.

Live (`pk_live_`/`sk_live_`) and payout (`rk_…`) keys are rejected during setup, at server startup, and on tool calls. After checking your integration in the sandbox, run your own application with its live keys. This local MCP server stays outside production payment paths.

## Development

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

License: MIT — see [LICENSE](LICENSE).
