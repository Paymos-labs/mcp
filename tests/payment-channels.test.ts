import { describe, expect, it, vi } from "vitest";
import { PaymosGateway } from "../src/gateway.js";
import { connect, jsonContent, TEST_KEY_ID, TEST_SECRET } from "./helpers.js";

const channel = {
  id: "pc_1", project_id: "prj_1", external_id: "customer-7",
  status: "active", is_test: true, is_accepting_payments: true, is_fully_provisioned: true,
  networks: [{ network: "TRC20", status: "active", address: "Ttest", tokens: [{ symbol: "USDT", minimum_deposit: "1.00" }] }],
};
const deposit = {
  id: "pcd_1", payment_channel_id: "pc_1", project_id: "prj_1", payment_channel_external_id: "customer-7",
  status: "confirmed", is_final: true, is_test: true, currency: "USDT", network: "TRC20",
  gross: "100.00", fee: "1.00", net: "99.00", tx_hash: "test-hash",
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function withFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => handler(String(args[0]), args[1]));
  const gateway = new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }, { fetch: fetchMock });
  return { gateway, fetchMock };
}

describe("payment channel tools through MCP and the published SDK", () => {
  it("creates, reads, blocks, and unblocks a channel with the right wire requests", async () => {
    const { gateway, fetchMock } = withFetch((url) => {
      const status = url.endsWith("/unblock") ? "provisioning" : url.endsWith("/block") ? "blocked" : "active";
      return response(200, { ...channel, status, is_accepting_payments: status === "active" });
    });
    const client = await connect(gateway);
    const created = await client.callTool({ name: "create_payment_channel", arguments: {
      project_id: "prj_1", external_id: "customer-7",
    } });
    expect(jsonContent(created)).toEqual(channel);
    const [createUrl, createInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(createUrl).toBe("https://api.paymos.io/v1/payment-channels");
    expect(createInit.method).toBe("POST");
    expect(JSON.parse(String(createInit.body))).toEqual({ project_id: "prj_1", external_id: "customer-7" });
    expect((createInit.headers as Headers).get("Authorization")).toMatch(/^HMAC-SHA256 /);

    for (const [name, suffix, method, status] of [
      ["get_payment_channel", "", "GET", "active"],
      ["block_payment_channel", "/block", "POST", "blocked"],
      ["unblock_payment_channel", "/unblock", "POST", "provisioning"],
    ] as const) {
      const result = await client.callTool({ name, arguments: { payment_channel_id: "pc_1" } });
      expect(jsonContent(result)).toMatchObject({ id: "pc_1", status });
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`https://api.paymos.io/v1/payment-channels/pc_1${suffix}`);
      expect(init.method).toBe(method);
    }
    await client.callTool({ name: "get_payment_channel", arguments: { payment_channel_id: "pc_1/a b" } });
    expect((fetchMock.mock.calls.at(-1) as [string, RequestInit])[0]).toBe("https://api.paymos.io/v1/payment-channels/pc_1%2Fa%20b");
    await client.close();
  });

  it("forwards every channel filter and returns the page unchanged", async () => {
    const page = { items: [channel], next_cursor: "next-1" };
    const { gateway, fetchMock } = withFetch(() => response(200, page));
    const client = await connect(gateway);
    const result = await client.callTool({ name: "list_payment_channels", arguments: {
      project_id: "prj_1", external_id: "customer-7", status: ["blocked", "active"], limit: 25, cursor: "before+1",
    } });
    expect(jsonContent(result)).toEqual(page);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(new URL(url).pathname).toBe("/v1/payment-channels");
    const query = new URL(url).searchParams;
    expect(query.get("project_id")).toBe("prj_1");
    expect(query.get("external_id")).toBe("customer-7");
    expect(query.getAll("status").sort()).toEqual(["active", "blocked"]);
    expect(query.get("limit")).toBe("25");
    expect(query.get("cursor")).toBe("before+1");
    await client.close();
  });

  it("forwards precise amounts, each stage and omitted stage; reads any deposit state", async () => {
    let currentState: "confirming" | "reorged" | "confirmed" = "confirmed";
    const { gateway, fetchMock } = withFetch(() => response(200, { ...deposit, status: currentState, is_final: currentState === "confirmed" }));
    const client = await connect(gateway);
    for (const stage of [undefined, "confirming", "reorged", "confirmed"] as const) {
      const result = await client.callTool({ name: "simulate_payment_channel_deposit", arguments: {
        payment_channel_id: "pc_1", amount: "100.00", currency: "USDT", network: "TRC20",
        ...(stage === undefined ? {} : { stage }),
      } });
      expect(jsonContent(result)).toEqual(deposit);
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe("https://api.paymos.io/v1/sandbox/payment-channels/pc_1/simulate-deposit");
      expect(init.method).toBe("POST");
      expect(JSON.parse(String(init.body))).toEqual({ amount: "100.00", currency: "USDT", network: "TRC20", ...(stage === undefined ? {} : { stage }) });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (currentState of ["confirming", "reorged", "confirmed"] as const) {
      const read = await client.callTool({ name: "get_payment_channel_deposit", arguments: { payment_channel_deposit_id: "pcd_1" } });
      expect(jsonContent(read)).toEqual({ ...deposit, status: currentState, is_final: currentState === "confirmed" });
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe("https://api.paymos.io/v1/payment-channel-deposits/pcd_1");
      expect(init.method).toBe("GET");
    }
    await client.close();
  });

  it("rejects unknown stage, a numeric amount, and invalid page bounds before fetch", async () => {
    const { gateway, fetchMock } = withFetch(() => response(200, deposit));
    const client = await connect(gateway);
    for (const args of [
      { payment_channel_id: "pc_1", amount: "1", currency: "USDT", network: "TRC20", stage: "invented" },
      { payment_channel_id: "pc_1", amount: 1, currency: "USDT", network: "TRC20" },
    ]) {
      expect((await client.callTool({ name: "simulate_payment_channel_deposit", arguments: args })).isError).toBe(true);
    }
    for (const limit of [0, 101, 1.5]) {
      expect((await client.callTool({ name: "list_payment_channel_deposits", arguments: { limit } })).isError).toBe(true);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    await client.close();
  });

  it("preserves empty feed cursor and blockage, forwards filters, and makes only one request", async () => {
    const page = { items: [], next_cursor: "next-feed", blocked: { deposit_id: "pcd_bad", reason: "inconsistent" } };
    const { gateway, fetchMock } = withFetch(() => response(200, page));
    const client = await connect(gateway);
    const result = await client.callTool({ name: "list_payment_channel_deposits", arguments: {
      project_id: "prj_1", payment_channel_id: "pc_1", limit: 20, cursor: "feed+1", confirmed_from: 1760000000,
    } });
    expect(jsonContent(result)).toEqual(page);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(new URL(url).pathname).toBe("/v1/payment-channel-deposits");
    const query = new URL(url).searchParams;
    expect(query.get("project_id")).toBe("prj_1");
    expect(query.get("payment_channel_id")).toBe("pc_1");
    expect(query.get("limit")).toBe("20");
    expect(query.get("cursor")).toBe("feed+1");
    expect(query.get("confirmed_from")).toBe("1760000000");
    await client.close();
  });

  it("refuses all eight tools for live, payout, missing and malformed credentials before fetch", async () => {
    const calls = [
      { name: "create_payment_channel", arguments: { project_id: "prj_1", external_id: "customer-7" } },
      { name: "get_payment_channel", arguments: { payment_channel_id: "pc_1" } },
      { name: "list_payment_channels", arguments: {} },
      { name: "block_payment_channel", arguments: { payment_channel_id: "pc_1" } },
      { name: "unblock_payment_channel", arguments: { payment_channel_id: "pc_1" } },
      { name: "simulate_payment_channel_deposit", arguments: { payment_channel_id: "pc_1", amount: "1", currency: "USDT", network: "TRC20" } },
      { name: "get_payment_channel_deposit", arguments: { payment_channel_deposit_id: "pcd_1" } },
      { name: "list_payment_channel_deposits", arguments: {} },
    ];
    for (const [apiKeyId, apiSecret, code] of [
      ["pk_live_abc", "sk_live_secret", "paymos/sandbox-only"],
      ["pk_test_abc", "rk_test_payout", "paymos/sandbox-only"],
      ["", "", "paymos/missing-credentials"],
      ["pk_test_abc", "malformed_secret", "paymos/invalid-credentials"],
    ] as const) {
      const fetchMock = vi.fn(async () => response(200, channel));
      const client = await connect(new PaymosGateway({ apiKeyId, apiSecret }, { fetch: fetchMock }));
      for (const call of calls) {
        const result = await client.callTool(call);
        expect(result.isError).toBe(true);
        expect(jsonContent(result)).toMatchObject({ code });
        if (apiSecret) expect(JSON.stringify(result)).not.toContain(apiSecret);
      }
      expect(fetchMock).not.toHaveBeenCalled();
      await client.close();
    }
  });

  it("returns the server error code without exposing credentials", async () => {
    const { gateway } = withFetch(() => response(404, {
      type: "https://api.paymos.io/problems/payment_channel_not_found", title: "Not found", status: 404,
      detail: "No matching channel.", code: "payment_channel_not_found",
    }));
    const client = await connect(gateway);
    const result = await client.callTool({ name: "get_payment_channel", arguments: { payment_channel_id: "pc_missing" } });
    expect(result.isError).toBe(true);
    expect(jsonContent(result)).toMatchObject({ code: "paymos/payment_channel_not_found" });
    expect(JSON.stringify(result)).not.toContain(TEST_SECRET);
    await client.close();
  });

  it("does not retry a deposit POST when the transport fails", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("network interrupted"); });
    const client = await connect(new PaymosGateway({ apiKeyId: TEST_KEY_ID, apiSecret: TEST_SECRET }, { fetch: fetchMock }));
    const result = await client.callTool({ name: "simulate_payment_channel_deposit", arguments: {
      payment_channel_id: "pc_1", amount: "1", currency: "USDT", network: "TRC20",
    } });
    expect(result.isError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await client.close();
  });
});
