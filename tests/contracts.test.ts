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
  it("exposes the existing tools and the integration recommendation", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "cancel_invoice",
      "block_payment_channel",
      "create_invoice",
      "create_payment_channel",
      "get_invoice",
      "get_payment_channel",
      "get_payment_channel_deposit",
      "list_invoices",
      "list_payment_channel_deposits",
      "list_payment_channels",
      "recommend_payment_integration",
      "simulate_payment_channel_deposit",
      "simulate_invoice_payment",
      "unblock_payment_channel",
      "verify_webhook_signature",
    ].sort());
  });

  it("freezes names, descriptions and input schemas", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }));
    const listed = await client.listTools();
    const digest = listed.tools
      .filter((tool) => ["create_invoice", "get_invoice", "list_invoices", "cancel_invoice", "simulate_invoice_payment", "verify_webhook_signature"].includes(tool.name))
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
    expect(stage?.enum).toEqual(["paid", "overpaid", "underpay", "cancel", "paid_late"]);
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
