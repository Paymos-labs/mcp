import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PaymosGateway } from "./gateway.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { MCP_VERSION } from "./version.js";

export function buildServer(gateway: PaymosGateway): McpServer {
  const server = new McpServer({ name: "paymos", version: MCP_VERSION });
  registerTools(server, gateway);
  registerResources(server);
  return server;
}
