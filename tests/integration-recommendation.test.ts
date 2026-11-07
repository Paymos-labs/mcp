import { describe, expect, it, vi } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { connect, jsonContent } from "./helpers.js";

type Recommendation = {
  scenario: string;
  recommendation: string;
  summary: string;
  guide: string;
};

describe("payment integration recommendation", () => {
  it("advertises the recommendation in initialization and the tool schema", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: "", apiSecret: "" }));
    expect(client.getInstructions()).toContain("recommend_payment_integration");
    expect(client.getInstructions()).toMatch(/Respect the merchant’s stated preference/);
    const tool = (await client.listTools()).tools.find((entry) => entry.name === "recommend_payment_integration");
    expect(tool?.description).toMatch(/invoices, payment channels, or both/);
    const scenario = (tool?.inputSchema as { properties?: Record<string, { enum?: string[] }> }).properties?.scenario;
    expect(scenario?.enum).toEqual(["order_checkout", "repeat_deposits", "both", "unsure"]);
  });

  it.each([
    ["order_checkout", "invoice", /order/i],
    ["repeat_deposits", "payment_channel", /deposit/i],
    ["both", "both", /invoices.*payment channels/i],
    ["unsure", "unsure", /ask/i],
  ])("recommends %s without credentials or a network call", async (scenario, recommendation, expectedSummary) => {
    const fetchMock = vi.fn<typeof fetch>();
    const globalFetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request"));
    try {
      const client = await connect(new PaymosGateway({ apiKeyId: "", apiSecret: "" }, { fetch: fetchMock }));
      const result = await client.callTool({ name: "recommend_payment_integration", arguments: { scenario } });
      expect(result.isError).not.toBe(true);
      expect(jsonContent(result)).toMatchObject({ scenario, recommendation, summary: expect.stringMatching(expectedSummary) });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      globalFetch.mockRestore();
    }
  });

  it("asks a question instead of choosing when the scenario is omitted", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: "", apiSecret: "" }));
    const result = await client.callTool({ name: "recommend_payment_integration", arguments: {} });
    const advice = jsonContent(result) as Recommendation;
    expect(advice.scenario).toBe("unsure");
    expect(advice.recommendation).toBe("unsure");
    expect(advice.summary).toMatch(/pay for each order.*top up.*or do both/i);
  });

  it("rejects an unknown scenario before any API call", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = await connect(new PaymosGateway({ apiKeyId: "", apiSecret: "" }, { fetch: fetchMock }));
    const result = await client.callTool({ name: "recommend_payment_integration", arguments: { scenario: "unknown" } });
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains sandbox isolation, deposit finality, deduplication, and feed recovery", async () => {
    const client = await connect(new PaymosGateway({ apiKeyId: "", apiSecret: "" }));
    const result = await client.callTool({ name: "recommend_payment_integration", arguments: { scenario: "both" } });
    const { guide } = jsonContent(result) as Recommendation;
    expect(guide).toMatch(/sandbox and production channels separately/i);
    expect(guide).toMatch(/sandbox addresses are synthetic/i);
    expect(guide).toMatch(/below the minimum.*not credited or returned/i);
    expect(guide).toMatch(/each deposit simulation creates a new test deposit/i);
    expect(guide).toMatch(/verify webhook signatures/i);
    expect(guide).toMatch(/confirmed.*is_final/i);
    expect(guide).toMatch(/event_id.*duplicate credit/i);
    expect(guide).toMatch(/next_cursor.*empty pages/i);
    expect(guide).toMatch(/confirmed_from.*unchanged/i);
    expect(guide).toMatch(/24 hours.*confirmed_from/i);
    expect(guide).toMatch(/create_invoice.*project_id.*external_order_id.*amount.*currency/i);
    expect(guide).toMatch(/create_payment_channel.*project_id.*external_id/i);
    expect(guide).toMatch(/get_payment_channel.*readiness/i);
    expect(guide).toMatch(/simulate_payment_channel_deposit.*payment_channel_id.*amount.*currency.*network/i);
  });
});
