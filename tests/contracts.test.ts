import { describe, expect, it } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { connect, TEST_KEY_ID, TEST_SECRET } from "./helpers.js";

/**
 * Task 3.3 — the contract freeze. Tool names, parameter schemas and enum
 * values are public surface from 1.0.0; the snapshot below is the tripwire.
 * If this test goes red you changed the contract: either revert, or cut a
 * major version and keep the old names alive through a deprecation period.
 */
describe("tool contract freeze", () => {
  it("exposes exactly the six v1 tools", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "cancel_invoice",
      "create_invoice",
      "get_invoice",
      "list_invoices",
      "simulate_invoice_payment",
      "verify_webhook_signature",
    ]);
  });

  it("freezes names, descriptions and input schemas", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listTools();
    const digest = listed.tools
      .map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }))
      .sort((left, right) => left.name.localeCompare(right.name));
    expect(digest).toMatchSnapshot();
  });

  it("freezes the simulate stage enum inside the snapshot-checked schema", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listTools();
    const simulate = listed.tools.find((tool) => tool.name === "simulate_invoice_payment");
    expect(simulate).toBeDefined();
    const stage = (simulate?.inputSchema as { properties?: Record<string, { enum?: string[] }> }).properties?.stage;
    expect(stage?.enum).toEqual(["paid", "overpaid", "underpay", "cancel"]);
  });

  it("freezes the gate error codes", async () => {
    const { SANDBOX_ONLY_CODE, MISSING_CREDENTIALS_CODE, INVALID_CREDENTIALS_CODE } = await import(
      "../src/gate.js"
    );
    expect([SANDBOX_ONLY_CODE, MISSING_CREDENTIALS_CODE, INVALID_CREDENTIALS_CODE]).toEqual([
      "paymos/sandbox-only",
      "paymos/missing-credentials",
      "paymos/invalid-credentials",
    ]);
  });
});
