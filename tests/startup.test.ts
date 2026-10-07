import { describe, expect, it } from "vitest";
import { checkCredentials, startupLine } from "../src/gate.js";

describe("startup line (stderr)", () => {
  it("announces a ready session with a truncated key id and no secret", () => {
    const secret = "sk_test_verysecretvalue000000";
    const line = startupLine(checkCredentials({ apiKeyId: "pk_test_ab12cd34ef", apiSecret: secret }), "pk_test_ab12cd34ef");
    expect(line).toBe("[paymos-mcp] sandbox session ready (pk_test_ab12…)");
    expect(line).not.toContain(secret);
  });

  it("carries the gate error for live keys, still without the secret", () => {
    const secret = "sk_live_verysecretvalue00000";
    const line = startupLine(checkCredentials({ apiKeyId: "pk_live_ab12cd34ef", apiSecret: secret }), "pk_live_ab12cd34ef");
    expect(line).toContain("paymos/sandbox-only");
    expect(line).toContain("phase 2");
    expect(line).not.toContain(secret);
  });

  it("carries the missing-credentials hint for an empty pair", () => {
    const line = startupLine(checkCredentials({ apiKeyId: "", apiSecret: "" }), "");
    expect(line).toContain("paymos/missing-credentials");
    expect(line).toContain("PAYMOS_API_KEY_ID");
  });
});
