import { describe, expect, it } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { SANDBOX_ONLY_CODE } from "../src/gate.js";
import { ToolError } from "../src/errors.js";
import { TEST_KEY_ID, TEST_SECRET } from "./helpers.js";

/**
 * Task 2.2: the gate is structural. A caller that never checks anything
 * itself — the stand-in for a freshly added tool — still cannot reach the API
 * with anything but a test key pair, because the only door is the gateway.
 */
describe("PaymosGateway (structural sandbox gate)", () => {
  it("hands out the invoices surface for a test pair", () => {
    const gateway = new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET });
    expect(typeof gateway.invoices().create).toBe("function");
  });

  it.each([
    ["live key id", { apiKeyId: "pk_live_abc", apiSecret: "sk_test_ok" }],
    ["live secret", { apiKeyId: "pk_test_ok", apiSecret: "sk_live_def" }],
    ["payout key", { apiKeyId: "pk_test_ok", apiSecret: "rk_test_def" }],
    ["payout key as id", { apiKeyId: "rk_live_def", apiSecret: "sk_test_ok" }],
    ["empty pair", { apiKeyId: "", apiSecret: "" }],
  ])("blocks access with %s on every call", (_name, credentials) => {
    const gateway = new PaymosGateway(credentials);
    expect(() => gateway.invoices()).toThrow(ToolError);
    expect(() => gateway.invoices()).toThrowError(expect.objectContaining({ code: expect.any(String) }));
    // And it keeps refusing on repeated access — the check is per-call, not cached-away.
    try {
      gateway.invoices();
      expect.unreachable("gateway must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ToolError);
      const toolError = error as ToolError;
      if (credentials.apiKeyId === "" && credentials.apiSecret === "") {
        expect(toolError.code).toBe("paymos/missing-credentials");
      } else {
        expect(toolError.code).toBe(SANDBOX_ONLY_CODE);
      }
    }
  });

  it("exposes the webhook secret for the local verification tool", () => {
    const gateway = new PaymosGateway({
      apiKeyId: TEST_KEY_ID,
      apiSecret: TEST_SECRET,
      webhookSecret: "whsec_x",
    });
    expect(gateway.webhookSecret()).toBe("whsec_x");
  });
});
