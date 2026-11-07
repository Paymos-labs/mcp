import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PaymosGateway } from "./gateway.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { INTEGRATION_INSTRUCTIONS, registerIntegrationRecommendation } from "./integration-recommendation.js";
import { MCP_VERSION } from "./version.js";

export function buildServer(gateway: PaymosGateway): McpServer {
  const server = new McpServer(
    { name: "paymos", version: MCP_VERSION },
    { instructions: INTEGRATION_INSTRUCTIONS },
  );
  registerTools(server, gateway);
  registerIntegrationRecommendation(server);
  registerResources(server);
  return server;
}
