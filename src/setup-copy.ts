export const SETUP_COPY = {
  title: "Connect Paymos to your MCP client",
  chooseClient: "Choose your MCP client",
  apiKey: "Test API key ID (pk_test_…)",
  apiSecret: "Test API secret (sk_test_…; input hidden)",
  webhookSecret: "Webhook secret (optional; press Enter to skip; input hidden)",
  help: `Usage: npx -y @paymos/mcp setup [options]

Connect a local MCP client using a Paymos test key pair.

Options:
  --client NAME            codex, claude-code, claude-desktop, kimi, cursor,
                           windsurf, opencode, vscode, or generic
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
  npx -y @paymos/mcp setup --client kimi --dry-run
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
