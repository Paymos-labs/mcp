/**
 * Credential configuration for the local Paymos MCP server. The pair is read from
 * env first (`PAYMOS_API_KEY_ID` + `PAYMOS_API_SECRET`) with `--api-key-id` /
 * `--api-secret` argv flags as fallback duplicates — the Stripe MCP pattern: env
 * wins on conflict, so a flag typo cannot silently override a configured key.
 */

export interface PaymosMcpCredentials {
  readonly apiKeyId: string;
  readonly apiSecret: string;
  readonly webhookSecret?: string;
}

export interface CredentialFlags {
  readonly apiKeyId?: string;
  readonly apiSecret?: string;
}

const FLAG_NAMES = new Map<string, keyof CredentialFlags>([
  ["--api-key-id", "apiKeyId"],
  ["--api-secret", "apiSecret"],
]);

export function parseFlags(argv: readonly string[]): CredentialFlags {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined || token === "--") break;
    const equals = token.indexOf("=");
    const head = equals < 0 ? token : token.slice(0, equals);
    const field = FLAG_NAMES.get(head);
    if (!field) continue;
    const value = equals < 0 ? argv[index + 1] : token.slice(equals + 1);
    if (value === undefined) break;
    flags[field] = value;
    if (equals < 0) index += 1;
  }
  return flags;
}

export function loadCredentials(
  env: Readonly<Record<string, string | undefined>>,
  flags: CredentialFlags,
): PaymosMcpCredentials {
  const apiKeyId = (env.PAYMOS_API_KEY_ID ?? flags.apiKeyId ?? "").trim();
  const apiSecret = (env.PAYMOS_API_SECRET ?? flags.apiSecret ?? "").trim();
  const webhookSecret = (env.PAYMOS_WEBHOOK_SECRET ?? "").trim();
  return webhookSecret === ""
    ? { apiKeyId, apiSecret }
    : { apiKeyId, apiSecret, webhookSecret };
}
