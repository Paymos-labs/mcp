import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCredentials } from "../src/config.js";
import { readCredentialFile } from "../src/credential-file.js";

const pair = { apiKeyId: "pk_test_saved", apiSecret: "sk_test_saved", webhookSecret: "whsec_saved" };
function file(content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "paymos-keys-")), "credentials.json");
  writeFileSync(path, content, { mode: 0o600 });
  return path;
}

describe("private credential file", () => {
  it("loads saved keys, trims strings and preserves legacy env/flag precedence", () => {
    const path = file(JSON.stringify(pair));
    expect(loadCredentials({ PAYMOS_CREDENTIALS_FILE: path }, {})).toEqual(pair);
    expect(loadCredentials({ PAYMOS_CREDENTIALS_FILE: path, PAYMOS_API_KEY_ID: "pk_test_env" },
      { apiKeyId: "pk_test_flag", apiSecret: "sk_test_flag" })).toEqual({
      apiKeyId: "pk_test_env", apiSecret: "sk_test_flag", webhookSecret: "whsec_saved",
    });
    expect(readCredentialFile(file(JSON.stringify({ apiKeyId: " pk_test_a ", apiSecret: " sk_test_b ", webhookSecret: " " })))).toEqual({
      apiKeyId: "pk_test_a", apiSecret: "sk_test_b",
    });
  });

  it.each(["null", "[]", '"sk_test_NEVER_PRINT"', '{"apiKeyId":"pk_test_a"}',
    '{"apiKeyId":1,"apiSecret":"sk_test_NEVER_PRINT"}',
    '{"apiKeyId":"pk_test_a","apiSecret":"sk_test_NEVER_PRINT","webhookSecret":4}',
    '{"sk_test_NEVER_PRINT":', "x".repeat(16_385)])("rejects malformed/oversized input without echoing it (%#)", text => {
    const path = file(text);
    expect(() => readCredentialFile(path)).toThrow("credentials file");
    try { readCredentialFile(path); } catch (error) {
      expect(String(error)).not.toContain("sk_test_NEVER_PRINT");
      expect(String(error)).not.toContain(path);
    }
  });

  it("does not silently ignore an explicitly configured missing file", () => {
    expect(() => loadCredentials({ PAYMOS_CREDENTIALS_FILE: join(tmpdir(), "paymos-no-such-file", "missing") }, {}))
      .toThrow("credentials file");
  });

  it.skipIf(process.platform === "win32")("rejects credentials readable by other accounts", () => {
    const path = file(JSON.stringify(pair));
    chmodSync(path, 0o644);
    expect(() => readCredentialFile(path)).toThrow("credentials file");
  });
});
