#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runAuth } from "./auth.js";
import { loadCredentials, parseFlags } from "./config.js";
import { runConnect } from "./connect.js";
import { runDownloadFile, runUploadFile } from "./files.js";
import { PaymosGateway } from "./gateway.js";
import { startupLine } from "./gate.js";
import { runInstallSecret } from "./install-secret.js";
import { buildServer } from "./server.js";
import { runSetup } from "./setup.js";
import { SETUP_COPY } from "./setup-copy.js";

/**
 * Stdio entry point. On a credential failure the server still starts (so the
 * MCP client sees the tools) but every API tool call answers with the gate
 * error — no API call runs. Startup lines go to stderr only: stdout is the
 * JSON-RPC channel, and no line ever contains the secret.
 */
export async function main(
  env: Readonly<Record<string, string | undefined>> = process.env,
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> {
  if (argv[0] === "setup") {
    await runSetup(argv.slice(1), env);
    return;
  }
  if (argv[0] === "auth") {
    const code = await runAuth(argv.slice(1), env);
    if (code !== 0) process.exitCode = code;
    return;
  }
  if (argv[0] === "connect") {
    const code = await runConnect(argv.slice(1), env);
    if (code !== 0) process.exitCode = code;
    return;
  }
  if (argv[0] === "install-secret") {
    await runInstallSecret(argv.slice(1));
    return;
  }
  if (argv[0] === "upload-file") {
    await runUploadFile(argv.slice(1));
    return;
  }
  if (argv[0] === "download-file") {
    await runDownloadFile(argv.slice(1));
    return;
  }
  if (argv[0] === "--help" || argv[0] === "-h") {
    console.log(SETUP_COPY.help);
    return;
  }
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
