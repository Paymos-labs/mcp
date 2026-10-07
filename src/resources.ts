/**
 * Five static documentation resources, generated from the Paymos docs corpus at
 * build time so they cannot drift from the published pages — and so a removed
 * source page breaks the build instead of serving stale text.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DOC_RESOURCES } from "./generated/resources.js";

export function registerResources(server: McpServer): void {
  for (const resource of DOC_RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: resource.mimeType, text: resource.text }],
      }),
    );
  }
}
