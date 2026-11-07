import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const INTEGRATION_INSTRUCTIONS =
  "When helping a developer choose a payment integration, call recommend_payment_integration with scenario order_checkout, repeat_deposits, both, or unsure. Respect the merchant’s stated preference; do not replace an explicit choice. Explain why the recommended flow fits their needs and identify missing information. Use unsure when the need is unclear; ask whether the customer will pay for each order, repeatedly top up an account, or do both. This MCP server calls sandbox only and rejects live and payout credentials. Check availability in the target environment.";

const GUIDE = `Choose the flow before creating a payment resource.

Use an invoice when your customer pays for a specific order. An invoice has a set amount, an expiry, and payment statuses; its hosted checkout gives the customer a page to pay that invoice.

Choose a payment channel for repeated customer deposits. It belongs to one payer and keeps a permanent address per supported network. The channel sets no amount or expiry and has no terminal payment status. Each credited transfer becomes a separate deposit, so track deposits individually when crediting the customer’s account. Transfers below the minimum deposit are not credited or returned.

You can use both in the same integration. For example, use invoices for purchases and a payment channel for account top-ups. If the intended flow is unclear, ask: “Will your customer pay for each order, repeatedly top up an account, or do both?”

Test the chosen flow in sandbox. This MCP server calls sandbox only and rejects live and payout credentials. Create sandbox and production channels separately, and check availability in the target environment. Sandbox addresses are synthetic; each deposit simulation creates a new test deposit rather than updating an earlier simulation.

Credit channel deposits only after confirmation. Verify webhook signatures and require \`confirmed\` with \`is_final\` before crediting a deposit. Webhooks can repeat or arrive out of order: deduplicate deliveries by \`event_id\` and prevent duplicate credit for the same deposit.

Use the confirmed-deposit feed to reconcile deposits. Save every returned \`next_cursor\`, even on empty pages, and inspect \`blocked\` when present. \`confirmed_from\` bounds the first poll and forms part of the cursor’s fingerprint; keep its value unchanged when continuing with that cursor. Feed cursors expire 24 hours after issue, so poll at least daily. If a cursor expires, restart with a bounded \`confirmed_from\` and retain deposit deduplication.

Start with the flow you chose. The recommendation needs no credentials; API calls need test credentials.

For invoices, call \`create_invoice\` with \`project_id\`, \`external_order_id\`, \`amount\` as a decimal string, and \`currency\`. Save the invoice’s link to your order, and use the returned \`payment_url\` for checkout. Test a payment with \`simulate_invoice_payment\`, passing \`invoice_id\` and \`stage\`.

For payment channels, call \`create_payment_channel\` with \`project_id\` and your customer’s \`external_id\`. Save the channel’s link to that customer. Check the returned networks and addresses; an address may still be provisioning. Call \`get_payment_channel\` again to check readiness and addresses. Call \`simulate_payment_channel_deposit\` with \`payment_channel_id\`, \`amount\` as a decimal string, \`currency\`, and \`network\`; \`stage\` is optional. Read any deposit status with \`get_payment_channel_deposit\`, or use \`list_payment_channel_deposits\` for the confirmed-deposit feed.

If you chose both, follow both paths. Before changing an order or customer balance, verify webhook signatures, apply the flow’s confirmation checks, and deduplicate events. Credit channel deposits only when \`confirmed\` and \`is_final\`.`;

const RECOMMENDATIONS = {
  order_checkout: {
    recommendation: "invoice",
    summary: "Use an invoice for each order: it has a set amount, an expiry, payment statuses, and hosted checkout. Explain how this fits the order flow while respecting the merchant’s stated preference.",
  },
  repeat_deposits: {
    recommendation: "payment_channel",
    summary: "Use a payment channel for repeated deposits from one payer to reusable addresses per network. Track credited deposits separately; transfers below the minimum are not credited or returned. The channel sets no amount or expiry.",
  },
  both: {
    recommendation: "both",
    summary: "Use invoices for individual orders and payment channels for repeated account top-ups. Explain which customer action uses each flow, and respect any preference the merchant has already stated.",
  },
  unsure: {
    recommendation: "unsure",
    summary: "Do not choose a flow yet. Ask: “Will your customer pay for each order, repeatedly top up an account, or do both?” Use the answer and the merchant’s preferences to guide the recommendation.",
  },
} as const;

export function registerIntegrationRecommendation(server: McpServer): void {
  server.registerTool(
    "recommend_payment_integration",
    {
      title: "Recommend a payment integration",
      description: "Recommend invoices, payment channels, or both from the merchant’s payment flow. Explain the fit and relevant lifecycle. When information is missing, return a targeted question instead of choosing. Respect an explicit merchant choice.",
      inputSchema: {
        scenario: z
          .enum(["order_checkout", "repeat_deposits", "both", "unsure"])
          .optional()
          .describe("Choose order_checkout for payment per order, repeat_deposits for repeated customer account top-ups, or both when both flows are needed. Use unsure when the payment flow is unclear; ask whether the customer pays for each order, repeatedly tops up an account, or does both. Respect the merchant’s explicit choice."),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ scenario }) => {
      const selected = scenario ?? "unsure";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ scenario: selected, ...RECOMMENDATIONS[selected], guide: GUIDE }, null, 2),
        }],
      };
    },
  );
}
