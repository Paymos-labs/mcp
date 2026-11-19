export const SETUP_COPY = {
  title: "Connect Paymos to your MCP client",
  chooseClient: "Choose your MCP client",
  apiKey: "Test API key ID (pk_test_…)",
  apiSecret: "Test API secret (sk_test_…; input hidden)",
  webhookSecret: "Webhook secret (optional; press Enter to skip; input hidden)",
  help: `Usage: npx -y @paymos/mcp setup [options]

Connect a local MCP client using a Paymos test key pair.

Options:
  --client NAME            codex, claude-code, claude-desktop, antigravity,
                           kimi, zcode (or glm), cursor, windsurf, opencode,
                           vscode, or generic
  --config PATH            Client configuration file (required for generic)
  --credentials-file PATH  Separate file for your test credentials
  --dry-run                Preview file paths and changes without writing
  --help, -h               Show this help

Without --client, setup asks you to choose a client in an interactive terminal.
Enter your test keys when prompted; secret input is hidden. Setup can also read
PAYMOS_API_KEY_ID, PAYMOS_API_SECRET, and optional PAYMOS_WEBHOOK_SECRET.
Live and payout keys are refused.

Credentials default to $XDG_CONFIG_HOME/paymos/mcp/credentials.json, or
~/.config/paymos/mcp/credentials.json when XDG_CONFIG_HOME is unset.
The client config contains the credentials file path, not the keys.

Examples:
  npx -y @paymos/mcp setup
  npx -y @paymos/mcp setup --client codex
  npx -y @paymos/mcp setup --client antigravity
  npx -y @paymos/mcp setup --client glm
  npx -y @paymos/mcp setup --client generic --config /path/to/mcp.json

Restart or reconnect your MCP client after setup.`,
  configured: (path: string) => `Paymos is configured in ${path}.`,
  preview: (path: string) => `Preview for ${path}. No files were changed.`,
  unchanged: (path: string) => `Paymos already matches this setup in ${path}. No changes needed.`,
  restart: "Restart or reconnect your MCP client to load Paymos.",
  errors: {
    arguments: "Check the setup options: an option is unknown, repeated, or missing its value. Run setup --help for examples.",
    client: "Choose a supported client with --client. Run setup --help for the client names.",
    configRequired: "This client needs a configuration path. Add --config with the path to its MCP configuration file.",
    nonInteractive: "Setup needs an interactive terminal to ask for missing values. Set --client, PAYMOS_API_KEY_ID, and PAYMOS_API_SECRET, then retry.",
    credentials: "Use a complete test key pair: pk_test_… and sk_test_…. Live and payout keys cannot be used with this server.",
    credentialFile: "The credentials file could not be read or is not valid. Check its path and JSON fields: apiKeyId, apiSecret, and optional webhookSecret.",
    configFile: "The client configuration could not be read or is not valid for this client. Check the file before retrying.",
    conflict: "The existing Paymos entry or credentials file differs from this setup. Review it or choose another path; it has not been overwritten.",
    changed: "A target file changed during setup. Review the latest file and run setup again.",
    symlink: "Setup cannot write through a symbolic link at a target path. Choose a regular file path.",
    cancelled: "Setup cancelled before configuration was saved.",
    write: "Setup could not save the files. Check the target paths and write permissions, then retry.",
  },
};

export const AUTH_COPY = {
  help: `Usage: npx -y @paymos/mcp auth [options]

Sign in to Paymos in your browser and configure your AI IDE or CLI for Merchant MCP.

Options:
  --client NAME      codex, claude-code, claude-desktop, antigravity, kimi,
                     zcode (or glm), cursor, windsurf, opencode, vscode, or generic
  --config PATH      Client configuration file (required for generic)
  --origin URL       Paymos origin override (default: https://app.paymos.io)
  --token-file PATH  OAuth token store path override
  --no-login         Write client configuration without opening browser login
  --dry-run          Preview client configurations without logging in or writing
  --help, -h         Show this help

Without --client, auth detects installed clients automatically or asks you to
choose one in an interactive terminal. Tokens are saved outside your IDE config
under OS-protected file permissions.`,
  chooseClient: "Choose your MCP client",
  preview: (client: string, path: string, name: string) =>
    `Preview for ${client} (${name}) in ${path}. No files were changed.`,
  configured: (client: string, path: string, name: string) =>
    `Configured Paymos Merchant MCP (${name}) for ${client} in ${path}.`,
  unchanged: (client: string, path: string, name: string) =>
    `Paymos Merchant MCP (${name}) already matches in ${path}.`,
  signedIn: (origin: string) => `Signed in to Paymos (${origin}).`,
  restart: "Restart or reconnect your MCP client to load Paymos Merchant MCP.",
  errors: {
    arguments: "Check the auth options: an option is unknown, repeated, or missing its value. Run auth --help for usage.",
    client_required: "Choose your client with --client (run auth --help for supported client names).",
    config_required: "This client needs a configuration path. Add --config with the path to its MCP configuration file.",
    invalid_origin: "Origin must use https:// or loopback http://127.0.0.1 / http://localhost.",
    configuration_conflict: "A Paymos entry conflicts with this connection or changed during setup. Review your MCP settings and try again.",
    configuration_scope_unknown: "The target MCP configuration path could not be verified safely.",
    auth_cancelled: "Sign-in was cancelled.",
    auth_failed: "Paymos browser sign-in could not complete.",
    configuration_restore_skipped: "Could not restore the previous MCP settings. Review your client's configuration before retrying.",
    configuration_write_failed: "Could not save the MCP settings. Check the file and its permissions.",
  },
};
