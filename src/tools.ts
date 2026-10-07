/**
 * The six v1 tools. Names and schemas are frozen public surface from v1.0.0 —
 * renaming or reshaping is a major version. Descriptions are written so an
 * agent never needs the external docs. Every API call goes through the
 * gateway; money and identifiers stay strings.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimestampSkewError, WebhookVerifier } from "@paymos/sdk";
import type { PaymosGateway } from "./gateway.js";
import { toolErrorFrom } from "./errors.js";
import { toWireShape } from "./wire-shape.js";

const NETWORKS =
  "TRC20, ERC20, BEP20, POLYGON, ARBITRUM, OPTIMISM, BASE, TON, AVAX, SOL, NEAR, SUI, PLASMA";

const INVOICE_STATUSES = [
  "awaiting_client",
  "awaiting_payment",
  "confirming",
  "underpaid_waiting",
  "paid",
  "paid_over",
  "underpaid",
  "expired",
  "cancelled",
] as const;

const INVOICE_RESULT_HINT =
  "Returns the invoice in wire form: invoice_id, status, payment_url, order, payment "
  + "(expected, address, transfers), expires_at. status: awaiting_client | awaiting_payment "
  + "| confirming | underpaid_waiting | paid | paid_over | underpaid | expired | cancelled.";

type ToolResult = {
  readonly content: Array<{ type: "text"; text: string }>;
  readonly isError?: boolean;
};

function textJson(value: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function failure(error: unknown): ToolResult {
  const toolError = toolErrorFrom(error);
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ code: toolError.code, message: toolError.message }, null, 2) }],
  };
}

async function guarded(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    return failure(error);
  }
}

export function registerTools(server: McpServer, gateway: PaymosGateway): void {
  server.registerTool(
    "create_invoice",
    {
      title: "Create a sandbox invoice",
      description:
        "Create a Paymos invoice and get a hosted payment_url the customer opens. "
        + "Idempotent per project: reuse the same external_order_id and you get the existing "
        + "invoice back instead of a duplicate. " + INVOICE_RESULT_HINT,
      inputSchema: {
        project_id: z.string().min(1).describe("Project receiving the invoice (prj_…)"),
        amount: z
          .string()
          .min(1)
          .describe('Decimal string, e.g. "50.00" — amounts are strings, never floats'),
        currency: z
          .string()
          .min(2)
          .describe("Fiat code (USD, EUR…) or stablecoin symbol (USDT, USDC…)"),
        network: z
          .string()
          .optional()
          .describe(
            `Locks the crypto invoice to one network: ${NETWORKS}. Omit to let the customer choose on the payment page`,
          ),
        external_order_id: z
          .string()
          .min(1)
          .max(128)
          .describe("Your order identifier (≤128 chars); idempotency key per project"),
        allow_multiple_payments: z
          .boolean()
          .optional()
          .describe("Allow the customer to pay an invoice in several transfers (default true)"),
        customer_fee_percent: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("0–100 service fee percent charged to the customer; overrides the project setting"),
        client_id: z
          .string()
          .max(200)
          .optional()
          .describe("Your customer reference (≤200 chars)"),
      },
    },
    async ({
      project_id,
      amount,
      currency,
      network,
      external_order_id,
      allow_multiple_payments,
      customer_fee_percent,
      client_id,
    }) =>
      guarded(async () => {
        const invoice = await gateway.invoices().create({
          projectId: project_id,
          amount,
          currency,
          externalOrderId: external_order_id,
          ...(network !== undefined ? { network } : {}),
          ...(allow_multiple_payments !== undefined ? { allowMultiplePayments: allow_multiple_payments } : {}),
          ...(customer_fee_percent !== undefined ? { customerFeePercent: customer_fee_percent } : {}),
          ...(client_id !== undefined ? { clientId: client_id } : {}),
        });
        return textJson(toWireShape(invoice));
      }),
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Read an invoice",
      description:
        "Fetch the current state of one Paymos invoice by invoice_id. " + INVOICE_RESULT_HINT,
      inputSchema: {
        invoice_id: z.string().min(1).describe("Invoice identifier (inv_…)"),
      },
    },
    async ({ invoice_id }) =>
      guarded(async () => {
        const invoice = await gateway.invoices().get(invoice_id);
        return textJson(toWireShape(invoice));
      }),
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description:
        "Read one cursor-paginated page of invoices for a project. Filters: status "
        + "(repeatable), external_order_id, created_from/created_to (Unix seconds). The result "
        + "carries items[] and next_cursor — next_cursor is absent on the last page. Poll with "
        + "the returned cursor; do not guess offsets.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project whose invoices to list (prj_…)"),
        limit: z.number().int().positive().optional().describe("Page size; the server default and maximum apply"),
        cursor: z.string().optional().describe("Cursor from a previous list_invoices response"),
        status: z
          .array(z.enum(INVOICE_STATUSES))
          .optional()
          .describe(
            "Repeatable status filter: awaiting_client | awaiting_payment | confirming | "
              + "underpaid_waiting | paid | paid_over | underpaid | expired | cancelled",
          ),
        external_order_id: z.string().optional().describe("Filter by your order identifier"),
        created_from: z.number().int().optional().describe("Unix seconds, inclusive lower bound"),
        created_to: z.number().int().optional().describe("Unix seconds, inclusive upper bound"),
      },
    },
    async ({ project_id, limit, cursor, status, external_order_id, created_from, created_to }) =>
      guarded(async () => {
        const page = await gateway.invoices().list({
          projectId: project_id,
          ...(limit !== undefined ? { limit } : {}),
          ...(cursor !== undefined ? { cursor } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(external_order_id !== undefined ? { externalOrderId: external_order_id } : {}),
          ...(created_from !== undefined ? { createdFrom: created_from } : {}),
          ...(created_to !== undefined ? { createdTo: created_to } : {}),
        });
        return textJson(toWireShape(page));
      }),
  );

  server.registerTool(
    "cancel_invoice",
    {
      title: "Cancel an invoice",
      description:
        "Cancel an invoice that has not been paid yet; the reason is stored on the record. "
        + "Invoices in a final status (paid, paid_over, underpaid, expired, cancelled) cannot "
        + "be cancelled. " + INVOICE_RESULT_HINT,
      inputSchema: {
        invoice_id: z.string().min(1).describe("Invoice identifier (inv_…)"),
        reason: z.string().min(1).max(500).describe("Why the invoice is cancelled (1–500 chars, stored)"),
      },
    },
    async ({ invoice_id, reason }) =>
      guarded(async () => {
        const invoice = await gateway.invoices().cancel(invoice_id, reason);
        return textJson(toWireShape(invoice));
      }),
  );

  server.registerTool(
    "simulate_invoice_payment",
    {
      title: "Simulate a sandbox payment",
      description:
        "Sandbox only: drive a test invoice through a payment outcome without touching a "
        + "blockchain. The server derives the amounts — never compute money client-side. "
        + "stage=paid marks it fully paid; overpaid pays more than expected; underpay pays "
        + "less (invoice lands in underpaid waiting for a top-up); cancel voids it. "
        + INVOICE_RESULT_HINT,
      inputSchema: {
        invoice_id: z.string().min(1).describe("Test invoice identifier (is_test=true)"),
        stage: z
          .enum(["paid", "overpaid", "underpay", "cancel"])
          .describe("Outcome to simulate: paid | overpaid | underpay | cancel"),
      },
    },
    async ({ invoice_id, stage }) =>
      guarded(async () => {
        const invoice = await gateway.invoices().simulatePayment(invoice_id, stage);
        return textJson(toWireShape(invoice));
      }),
  );

  server.registerTool(
    "verify_webhook_signature",
    {
      title: "Verify a webhook signature",
      description:
        "Verify the X-Webhook-Signature header of a Paymos webhook against its raw body, "
        + "locally (no API call). Header format: t={unix},v1={hmac_hex(\"{unix}.{payload}\")}; "
        + "during secret rotation two v1= values are present and either may match. Use the raw "
        + "request body byte-for-byte — re-serialized JSON breaks the signature.",
      inputSchema: {
        payload: z.string().min(1).describe("The raw webhook body exactly as received"),
        signature_header: z.string().describe("The X-Webhook-Signature header value, e.g. t=1760000000,v1=9f2c…"),
        secret: z.string().optional().describe("Webhook secret (whsec_…); defaults to PAYMOS_WEBHOOK_SECRET"),
        tolerance_seconds: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Max age of the t= timestamp (default 300); older headers are rejected as expired"),
      },
    },
    async ({ payload, signature_header, secret, tolerance_seconds }) => {
      const effectiveSecret = secret ?? gateway.webhookSecret();
      if (effectiveSecret === undefined) {
        return textJson({ valid: false, reason: "missing_secret" });
      }
      const verifier = new WebhookVerifier(
        effectiveSecret,
        tolerance_seconds === undefined ? 300 : tolerance_seconds,
      );
      try {
        verifier.assertValid(signature_header, payload);
        return textJson({ valid: true });
      } catch (error) {
        if (error instanceof TimestampSkewError) return textJson({ valid: false, reason: "expired" });
        return textJson({ valid: false, reason: "bad_signature" });
      }
    },
  );
}
