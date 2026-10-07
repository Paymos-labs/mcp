import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { connect, jsonContent, TEST_KEY_ID, TEST_SECRET } from "./helpers.js";

const WIRE_INVOICE = {
  invoice_id: "inv_test_9",
  project_id: "prj_2",
  status: "awaiting_payment",
  is_final: false,
  is_test: true,
  payment_url: "https://pay.paymos.io/i/inv_test_9",
  order: {
    external_id: "order_42",
    amount: "50.00",
    currency: "USDT",
    network: "TRC20",
  },
  payment: {
    currency: "USDT",
    network: "TRC20",
    chain_id: 7281264,
    expected: "50.00",
    address: "TXYZexampleAddress",
  },
  created_at: 1760000000,
  updated_at: 1760000000,
  expires_at: 1760003600,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": status === 200 || status === 201 ? "application/json" : "application/problem+json" },
  });
}

function gatewayWithFetch(
  handler: (url: string, init?: RequestInit) => Response,
): { gateway: PaymosGateway; fetchMock: ReturnType<typeof vi.fn> } {
  const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => handler(String(args[0]), args[1]));
  return { gateway: new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }, { fetch: fetchMock }), fetchMock };
}

describe("invoice tools over a mocked SDK transport", () => {
  it("create_invoice returns the wire-shaped invoice and signs the request", async () => {
    const { gateway, fetchMock } = gatewayWithFetch(() => jsonResponse(201, WIRE_INVOICE));
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "create_invoice",
      arguments: {
        project_id: "prj_2",
        amount: "50.00",
        currency: "USDT",
        network: "TRC20",
        external_order_id: "order_42",
      },
    });
    expect(result.isError).toBeUndefined();
    const invoice = jsonContent(result) as Record<string, unknown>;
    expect(invoice.invoice_id).toBe("inv_test_9");
    expect(invoice.payment_url).toBe("https://pay.paymos.io/i/inv_test_9");
    expect((invoice.order as Record<string, unknown>).external_id).toBe("order_42");
    expect((invoice.payment as Record<string, unknown>).expected).toBe("50.00");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.paymos.io/v1/invoices");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.project_id).toBe("prj_2");
    expect(body.external_order_id).toBe("order_42");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toMatch(/^HMAC-SHA256 /);
    expect(headers.get("X-Request-Timestamp")).toMatch(/^\d+$/);
  });

  it("get_invoice maps invoice_not_found to a tool error with the api code", async () => {
    const { gateway } = gatewayWithFetch(() =>
      jsonResponse(404, {
        type: "https://api.paymos.io/problems/invoice_not_found",
        title: "Invoice not found",
        status: 404,
        detail: "No invoice with this identifier.",
        code: "invoice_not_found",
      }),
    );
    const client = await connect(gateway);
    const result = await client.callTool({ name: "get_invoice", arguments: { invoice_id: "inv_missing" } });
    expect(result.isError).toBe(true);
    const error = jsonContent(result) as { code: string; message: string };
    expect(error.code).toBe("paymos/invoice_not_found");
    expect(error.message).toContain("No invoice with this identifier.");
  });

  it("list_invoices passes filters and returns items with next_cursor", async () => {
    const { gateway, fetchMock } = gatewayWithFetch(() =>
      jsonResponse(200, {
        items: [{ ...WIRE_INVOICE, invoice_id: "inv_test_10" }],
        next_cursor: "cursor-1",
      }),
    );
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "list_invoices",
      arguments: {
        project_id: "prj_2",
        status: ["paid", "confirming"],
        created_from: 1759000000,
        created_to: 1760000000,
      },
    });
    const page = jsonContent(result) as { items: Array<{ invoice_id: string }>; next_cursor: string };
    expect(page.items[0]?.invoice_id).toBe("inv_test_10");
    expect(page.next_cursor).toBe("cursor-1");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const query = new URL(url).searchParams;
    expect(query.get("project_id")).toBe("prj_2");
    expect(query.getAll("status")).toEqual(["confirming", "paid"]);
    expect(query.get("created_from")).toBe("1759000000");
    expect(query.get("created_to")).toBe("1760000000");
  });

  it("list_invoices on the last page omits next_cursor", async () => {
    const { gateway } = gatewayWithFetch(() => jsonResponse(200, { items: [] }));
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "list_invoices",
      arguments: { project_id: "prj_2" },
    });
    const page = jsonContent(result) as Record<string, unknown>;
    expect(page.items).toEqual([]);
    expect("next_cursor" in page).toBe(false);
  });

  it("cancel_invoice posts the reason", async () => {
    const { gateway, fetchMock } = gatewayWithFetch(() =>
      jsonResponse(200, { ...WIRE_INVOICE, status: "cancelled" }),
    );
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "cancel_invoice",
      arguments: { invoice_id: "inv_test_9", reason: "customer changed the order" },
    });
    const invoice = jsonContent(result) as { status: string };
    expect(invoice.status).toBe("cancelled");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.paymos.io/v1/invoices/inv_test_9/cancel");
    expect(JSON.parse(String(init.body))).toEqual({ reason: "customer changed the order" });
  });

  it("simulate_invoice_payment targets the sandbox endpoint with the stage", async () => {
    const { gateway, fetchMock } = gatewayWithFetch(() =>
      jsonResponse(200, { ...WIRE_INVOICE, status: "paid" }),
    );
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "simulate_invoice_payment",
      arguments: { invoice_id: "inv_test_9", stage: "paid" },
    });
    const invoice = jsonContent(result) as { status: string };
    expect(invoice.status).toBe("paid");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.paymos.io/v1/sandbox/invoices/inv_test_9/simulate-payment");
    expect(JSON.parse(String(init.body))).toEqual({ stage: "paid" });
  });

  it("maps a validation problem to paymos/<code>", async () => {
    const { gateway } = gatewayWithFetch(() =>
      jsonResponse(400, {
        type: "https://api.paymos.io/problems/field_invalid_amount",
        title: "Invalid amount",
        status: 400,
        detail: "amount must be greater than zero",
        code: "field_invalid_amount",
        field: "amount",
      }),
    );
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "create_invoice",
      arguments: { project_id: "prj_2", amount: "0.00", currency: "USDT", external_order_id: "x" },
    });
    expect(result.isError).toBe(true);
    const error = jsonContent(result) as { code: string };
    expect(error.code).toBe("paymos/field_invalid_amount");
  });

  it("refuses every tool call when the only credentials are live keys", async () => {
    const gateway = new PaymosGateway({ apiKeyId: "pk_live_abc", apiSecret: "sk_live_def" });
    const client = await connect(gateway);
    const result = await client.callTool({
      name: "get_invoice",
      arguments: { invoice_id: "inv_test_9" },
    });
    expect(result.isError).toBe(true);
    const error = jsonContent(result) as { code: string; message: string };
    expect(error.code).toBe("paymos/sandbox-only");
    expect(error.message).toContain("phase 2");
    expect(error.message).not.toContain("sk_live_def");
  });
});

describe("verify_webhook_signature (local, no API call)", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ event_id: "evt_1", event_type: "invoice.paid" });

  function signedHeader(timestamp: number, override?: string): string {
    const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    return `t=${timestamp},v1=${override ?? digest}`;
  }

  function gateway(secretValue?: string): PaymosGateway {
    const credentials: { apiKeyId: string; apiSecret: string; webhookSecret?: string } = {
      apiKeyId: TEST_KEY_ID,
      apiSecret: TEST_SECRET,
    };
    if (secretValue !== undefined) credentials.webhookSecret = secretValue;
    return new PaymosGateway(credentials);
  }

  async function verify(client: Awaited<ReturnType<typeof connect>>, args: Record<string, unknown>) {
    const result = await client.callTool({ name: "verify_webhook_signature", arguments: args });
    return jsonContent(result) as { valid: boolean; reason?: string };
  }

  it("accepts a freshly signed webhook", async () => {
    const client = await connect(gateway(secret));
    const outcome = await verify(client, {
      payload,
      signature_header: signedHeader(Math.floor(Date.now() / 1000)),
    });
    expect(outcome).toEqual({ valid: true });
  });

  it("accepts either signature during a two-v1 rotation", async () => {
    const client = await connect(gateway(secret));
    const timestamp = Math.floor(Date.now() / 1000);
    const outcome = await verify(client, {
      payload,
      signature_header: `${signedHeader(timestamp)},v1=${"0".repeat(64)}`,
    });
    expect(outcome).toEqual({ valid: true });
  });

  it("reports bad_signature for a wrong digest", async () => {
    const client = await connect(gateway(secret));
    const outcome = await verify(client, {
      payload,
      signature_header: signedHeader(Math.floor(Date.now() / 1000), "0".repeat(64)),
    });
    expect(outcome).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("reports expired beyond the tolerance", async () => {
    const client = await connect(gateway(secret));
    const outcome = await verify(client, {
      payload,
      signature_header: signedHeader(Math.floor(Date.now() / 1000) - 3600),
    });
    expect(outcome).toEqual({ valid: false, reason: "expired" });
  });

  it("honours a custom tolerance_seconds of zero", async () => {
    const client = await connect(gateway(secret));
    const outcome = await verify(client, {
      payload,
      signature_header: signedHeader(Math.floor(Date.now() / 1000) - 1),
      tolerance_seconds: 0,
    });
    expect(outcome).toEqual({ valid: false, reason: "expired" });
  });

  it("reports missing_secret when neither argument nor env provides one", async () => {
    const client = await connect(gateway());
    const outcome = await verify(client, {
      payload,
      signature_header: "t=1760000000,v1=9f2c",
    });
    expect(outcome).toEqual({ valid: false, reason: "missing_secret" });
  });

  it("prefers the explicit secret argument over the configured one", async () => {
    const client = await connect(gateway("whsec_configured"));
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const outcome = await verify(client, {
      payload,
      signature_header: `t=${timestamp},v1=${digest}`,
      secret,
    });
    expect(outcome).toEqual({ valid: true });
  });
});
