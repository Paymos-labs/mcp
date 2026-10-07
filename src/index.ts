#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadCredentials, parseFlags } from "./config.js";
import { PaymosGateway } from "./gateway.js";
import { startupLine } from "./gate.js";
import { buildServer } from "./server.js";

/**
 * Stdio entry point. On a credential failure the server still starts (so the
 * MCP client sees the six tools) but every tool call answers with the gate
 * error — no tool runs. Startup lines go to stderr only: stdout is the
 * JSON-RPC channel, and no line ever contains the secret.
 */
export async function main(
  env: Readonly<Record<string, string | undefined>> = process.env,
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const credentials = loadCredentials(env, parseFlags(argv));
  const gateway = new PaymosGateway(credentials);
  console.error(startupLine(gateway.check(), credentials.apiKeyId));
  const server = buildServer(gateway);
  await server.connect(new StdioServerTransport());
}

// npx runs the bin through a .bin symlink; resolve it before comparing or the
// guard silently skips main() on Linux (argv[1] is the link, not this file).
const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(`[paymos-mcp] fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
