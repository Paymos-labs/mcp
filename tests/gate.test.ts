import { describe, expect, it } from "vitest";
import {
  checkCredentials,
  INVALID_CREDENTIALS_CODE,
  MISSING_CREDENTIALS_CODE,
  SANDBOX_ONLY_CODE,
} from "../src/gate.js";

const LIVE_SECRET = "sk_live_supersecretvalue123";

function pair(apiKeyId: string, apiSecret: string) {
  return { apiKeyId, apiSecret };
}

describe("checkCredentials", () => {
  it("accepts the test pair", () => {
    expect(checkCredentials(pair("pk_test_abc", "sk_test_def"))).toEqual({ ok: true });
  });

  it("refuses an empty pair with the missing-credentials error", () => {
    const check = checkCredentials(pair("", ""));
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe(MISSING_CREDENTIALS_CODE);
    expect(check.message).toContain("PAYMOS_API_KEY_ID");
  });

  it.each(["pk_live_abc", "sk_live_def"].map((value) => [value]))(
    "refuses a live credential (%s)",
    (value) => {
      const other = value.startsWith("pk_") ? "sk_test_ok" : "pk_test_ok";
      const check = checkCredentials(
        value.startsWith("pk_") ? pair(value, other) : pair(other, value),
      );
      expect(check.ok).toBe(false);
      if (check.ok) return;
      expect(check.code).toBe(SANDBOX_ONLY_CODE);
      expect(check.message).toContain("phase 2");
      expect(check.message).toContain("Developers → API keys");
    },
  );

  it.each(["rk_live_payoutkey", "rk_test_payoutkey"].map((value) => [value]))(
    "refuses payout keys, including test ones (%s)",
    (value) => {
      const check = checkCredentials(pair("pk_test_ok", value));
      expect(check.ok).toBe(false);
      if (check.ok) return;
      expect(check.code).toBe(SANDBOX_ONLY_CODE);
    },
  );

  it("refuses a payout key presented as the key id", () => {
    const check = checkCredentials(pair("rk_test_payoutkey", "sk_test_ok"));
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe(SANDBOX_ONLY_CODE);
  });

  it("refuses malformed credentials without the sandbox-only wording", () => {
    const check = checkCredentials(pair("pk_test_abc", "not-a-paymos-secret"));
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe(INVALID_CREDENTIALS_CODE);
  });

  it("never embeds the secret value in any refusal message", () => {
    const checks = [
      checkCredentials(pair("pk_live_abc", LIVE_SECRET)),
      checkCredentials(pair("pk_test_abc", LIVE_SECRET)),
      checkCredentials(pair("", LIVE_SECRET)),
    ];
    for (const check of checks) {
      expect(check.ok).toBe(false);
      if (check.ok) continue;
      expect(check.message).not.toContain(LIVE_SECRET);
    }
  });
});
