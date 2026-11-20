export const SETUP_COPY = {
  title: "Connect Paymos to your MCP client",
  chooseClient: "Choose your MCP client",
  apiKey: "Test API key ID (pk_test_…)",
  apiSecret: "Test API secret (sk_test_…; input hidden)",
  webhookSecret: "Webhook secret (optional; press Enter to skip; input hidden)",
  offerBrowserAuth: "Sign in to Paymos in your browser now so account and sandbox tools are ready too? [Y/n]",
  offerBrowserRetry: "Please enter y (yes) or n (no) [Y/n]",
  referenceReady:
    "Paymos is ready in offline reference and integration-advisor mode (27 docs, advisor, and webhook verifier). Account/sandbox tools will prompt browser sign-in only when called.",
  loginSkippedAfterConfig:
    "Your MCP client configuration remains saved in offline reference and advisor mode. Run `npx -y @paymos/mcp setup` again or call an account tool later to sign in.",
  help: `Usage: npx -y @paymos/mcp setup [options]

Configure your AI IDE or CLI for Paymos Merchant MCP (zero-key setup with
offline docs, integration advisor, and optional browser OAuth sign-in).

Options:
  --client NAME            codex, claude-code, claude-desktop, antigravity,
                           kimi, zcode (or glm), cursor, windsurf, opencode,
                           vscode, or generic
  --config PATH            Client configuration file (required for generic)
  --origin URL             Paymos origin override (default: https://app.paymos.io)
  --token-file PATH        OAuth token store path override
  --no-login               Configure clients without offering browser OAuth
  --sandbox                Use legacy Sandbox test-key setup (credentials.json)
  --credentials-file PATH  Separate file for Sandbox test credentials
  --dry-run                Preview file paths and changes without writing
  --help, -h               Show this help

By default, setup detects installed clients (or asks in an interactive
terminal), writes the \`@paymos/mcp connect\` configuration first, and then
offers browser OAuth sign-in ([Y/n]). Declining OAuth or running non-
interactively leaves Paymos configured in offline reference & advisor mode.

Legacy Sandbox test-key mode activates only with --sandbox, --credentials-file,
or PAYMOS_API_KEY_ID / PAYMOS_API_SECRET / PAYMOS_CREDENTIALS_FILE in env
(live and payout keys are refused). Do not mix Sandbox key options with
--origin, --token-file, or --no-login.

Examples:
  npx -y @paymos/mcp setup
  npx -y @paymos/mcp setup --client codex
  npx -y @paymos/mcp setup --client antigravity --no-login
  npx -y @paymos/mcp setup --client glm
  npx -y @paymos/mcp setup --sandbox --client codex
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
  openingBrowser: (url: string) =>
    `Opening Paymos sign-in in your browser. To use another browser, open: ${url}`,
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
