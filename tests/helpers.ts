import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PaymosGateway } from "../src/gateway.js";
import { buildServer } from "../src/server.js";

export async function connect(gateway: PaymosGateway): Promise<Client> {
  const server = buildServer(gateway);
  const client = new Client({ name: "mcp-test-client", version: "1.0.0" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

export function jsonContent(result: unknown): unknown {
  const blocks = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const text = blocks?.find((block) => block.type === "text")?.text;
  if (text === undefined) throw new Error("tool result has no text block");
  return JSON.parse(text);
}

export const TEST_KEY_ID = "pk_test_1111111111111111";
export const TEST_SECRET = "sk_test_2222222222222222";
