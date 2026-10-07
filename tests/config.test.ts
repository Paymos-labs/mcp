import { describe, expect, it } from "vitest";
import { loadCredentials, parseFlags } from "../src/config.js";

describe("parseFlags", () => {
  it("reads --flag value pairs", () => {
    expect(parseFlags(["--api-key-id", "pk_test_a", "--api-secret", "sk_test_b"])).toEqual({
      apiKeyId: "pk_test_a",
      apiSecret: "sk_test_b",
    });
  });

  it("reads --flag=value pairs", () => {
    expect(parseFlags(["--api-key-id=pk_test_a", "--api-secret=sk_test_b"])).toEqual({
      apiKeyId: "pk_test_a",
      apiSecret: "sk_test_b",
    });
  });

  it("ignores unrelated arguments", () => {
    expect(parseFlags(["--verbose", "positional", "--api-key-id", "pk_test_a"])).toEqual({
      apiKeyId: "pk_test_a",
    });
  });
});

describe("loadCredentials", () => {
  it("env wins over flags", () => {
    const credentials = loadCredentials(
      { PAYMOS_API_KEY_ID: "pk_test_env", PAYMOS_API_SECRET: "sk_test_env" },
      { apiKeyId: "pk_test_flag", apiSecret: "sk_test_flag" },
    );
    expect(credentials).toEqual({ apiKeyId: "pk_test_env", apiSecret: "sk_test_env" });
  });

  it("falls back to flags when env is empty", () => {
    const credentials = loadCredentials(
      {},
      { apiKeyId: "pk_test_flag", apiSecret: "sk_test_flag" },
    );
    expect(credentials).toEqual({ apiKeyId: "pk_test_flag", apiSecret: "sk_test_flag" });
  });

  it("reads the optional webhook secret from env", () => {
    const credentials = loadCredentials(
      {
        PAYMOS_API_KEY_ID: "pk_test_a",
        PAYMOS_API_SECRET: "sk_test_b",
        PAYMOS_WEBHOOK_SECRET: "whsec_x",
      },
      {},
    );
    expect(credentials.webhookSecret).toBe("whsec_x");
  });

  it("omits the webhook secret when unset", () => {
    const credentials = loadCredentials(
      { PAYMOS_API_KEY_ID: "pk_test_a", PAYMOS_API_SECRET: "sk_test_b" },
      {},
    );
    expect("webhookSecret" in credentials).toBe(false);
  });

  it("yields an empty pair when nothing is configured", () => {
    expect(loadCredentials({}, {})).toEqual({ apiKeyId: "", apiSecret: "" });
  });
});
