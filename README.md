# @paymos/mcp

Connect your coding agent to the Paymos sandbox through a local MCP server. The agent can create test invoices, simulate payment scenarios, inspect invoice states, and verify webhook signatures while building your application around a Paymos server SDK.

The server runs over stdio. It exposes six tools and five documentation resources and accepts test key pairs only. Live and payout keys are refused.

## Requirements

- Node.js 20 or newer
- A Paymos merchant account with a test key pair from Dashboard → Developer → API Keys (`pk_test_…` and `sk_test_…`)
- An MCP client that can launch a local stdio server

## Setup

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
| Kimi CLI | `kimi` | `$KIMI_CODE_HOME/mcp.json` or `~/.kimi-code/mcp.json` |
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
| `create_invoice` | Create a sandbox invoice; idempotent per `external_order_id`; returns `payment_url` |
| `get_invoice` | Fetch the current invoice state |
| `list_invoices` | Fetch one cursor page of invoices, with filters |
| `cancel_invoice` | Cancel an unpaid invoice and store the reason |
| `simulate_invoice_payment` | Simulate `paid`, `paid_late`, `overpaid`, `underpay`, or `cancel` in the sandbox |
| `verify_webhook_signature` | Verify `X-Webhook-Signature` against the raw webhook body locally |

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

Hosted MCP is deferred and is not available as a connection method.

## Development

```bash
npm install                 # @paymos/sdk resolves from ../typescript-sdk
npm run build:resources     # regenerate documentation resources
npm test                    # package tests
npm run build               # bundle to dist/
```

License: MIT — see [LICENSE](LICENSE).
