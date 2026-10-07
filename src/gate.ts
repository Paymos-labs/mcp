/**
 * Structural sandbox gate — v1 of the Paymos MCP server accepts only the test
 * key pair. Every credential failure below carries a category, never the value
 * of the key: the secret must not reach logs, stdout or error text.
 */

import type { PaymosMcpCredentials } from "./config.js";

export const SANDBOX_ONLY_CODE = "paymos/sandbox-only";
export const SANDBOX_ONLY_MESSAGE =
  "Live keys arrive in phase 2. Create a test key pair in Dashboard → Developers → API keys.";

export const MISSING_CREDENTIALS_CODE = "paymos/missing-credentials";
export const MISSING_CREDENTIALS_MESSAGE =
  "No Paymos credentials found. Set the env pair PAYMOS_API_KEY_ID (pk_test_…) and "
  + "PAYMOS_API_SECRET (sk_test_…) from Dashboard → Developers → API keys, or pass "
  + "--api-key-id / --api-secret.";

export const INVALID_CREDENTIALS_CODE = "paymos/invalid-credentials";
export const INVALID_CREDENTIALS_MESSAGE =
  "Credentials do not look like a Paymos test pair. Expected PAYMOS_API_KEY_ID to start "
  + "with pk_test_ and PAYMOS_API_SECRET to start with sk_test_ "
  + "(Dashboard → Developers → API keys).";

const TEST_KEY_PREFIX = "pk_test_";
const TEST_SECRET_PREFIX = "sk_test_";
const FORBIDDEN_PREFIXES = ["pk_live_", "sk_live_", "rk_"] as const;

export type CredentialCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

export function checkCredentials(credentials: PaymosMcpCredentials): CredentialCheck {
  if (credentials.apiKeyId === "" && credentials.apiSecret === "") {
    return { ok: false, code: MISSING_CREDENTIALS_CODE, message: MISSING_CREDENTIALS_MESSAGE };
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (credentials.apiKeyId.startsWith(prefix) || credentials.apiSecret.startsWith(prefix)) {
      return { ok: false, code: SANDBOX_ONLY_CODE, message: SANDBOX_ONLY_MESSAGE };
    }
  }
  if (!credentials.apiKeyId.startsWith(TEST_KEY_PREFIX) || !credentials.apiSecret.startsWith(TEST_SECRET_PREFIX)) {
    return { ok: false, code: INVALID_CREDENTIALS_CODE, message: INVALID_CREDENTIALS_MESSAGE };
  }
  return { ok: true };
}

/**
 * The only startup text the server prints (stderr). Shows a truncated key id
 * for orientation and never any part of the secret.
 */
export function startupLine(check: CredentialCheck, apiKeyId: string): string {
  return check.ok
    ? `[paymos-mcp] sandbox session ready (${apiKeyId.slice(0, TEST_KEY_PREFIX.length + 4)}…)`
    : `[paymos-mcp] ${check.code}: ${check.message}`;
}
