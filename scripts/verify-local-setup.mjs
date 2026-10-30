// Package verification; npm may download dependencies. No Merchant API/model
// requests are made and no Paymos application host is started.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.env.npm_execpath;
assert(npm && existsSync(npm), "Run through npm run verify:local");
function run(args, options = {}) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    cwd: root, encoding: "utf8", timeout: 180_000, windowsHide: true, ...options,
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`npm ${args[0]} failed (${result.status ?? "timeout"})`);
  }
  return result;
}
for (const command of ["check", "test", "build"]) {
  const result = run(["run", command]);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}

const temp = mkdtempSync(join(tmpdir(), "paymos-packed-"));
const packed = JSON.parse(run(["pack", "--ignore-scripts", "--json", "--pack-destination", temp]).stdout);
assert.equal(packed.length, 1);
assert(packed[0].files.some(file => file.path === "dist/index.js"));
assert(!packed[0].files.some(file => /(?:^|\/)(?:credentials\.json|\.env)$/.test(file.path)));
writeFileSync(join(temp, "package.json"), '{"private":true}\n');
run(["install", "--ignore-scripts", "--no-audit", "--no-fund", join(temp, packed[0].filename)], { cwd: temp });
const bin = join(temp, "node_modules", "@paymos", "mcp", "dist", "index.js");
assert(existsSync(bin));
const clientConfig = join(temp, "client.json");
const credentialFile = join(temp, "private", "credentials.json");
const secret = "sk_test_packed_DO_NOT_PRINT";
const webhookSecret = "whsec_packed_DO_NOT_PRINT";
const isolatedEnv = { ...process.env, HOME: temp, USERPROFILE: temp,
  PAYMOS_API_KEY_ID: "pk_test_packed", PAYMOS_API_SECRET: secret, PAYMOS_WEBHOOK_SECRET: webhookSecret };
delete isolatedEnv.PAYMOS_CREDENTIALS_FILE;
for (const args of [["--help"], ["setup", "--help"]]) {
  const result = spawnSync(process.execPath, [bin, ...args], { env: isolatedEnv, encoding: "utf8", timeout: 10_000, windowsHide: true });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /setup/);
  assert(!result.stderr.includes("sandbox session ready"));
}
const args = ["setup", "--client", "generic", "--config", clientConfig, "--credentials-file", credentialFile];
for (let attempt = 0; attempt < 2; attempt++) {
  // Exercise npm's installed bin shim, not just a source import.
  const result = run(["exec", "--offline", "--no", "--", "paymos-mcp", ...args], { cwd: temp, env: isolatedEnv });
  assert(!result.stdout.includes(secret) && !result.stderr.includes(secret));
  assert(!result.stdout.includes(webhookSecret) && !result.stderr.includes(webhookSecret));
  assert.match(result.stdout, attempt === 0 ? /configured/ : /already matches/);
}
const config = JSON.parse(readFileSync(clientConfig, "utf8"));
assert.equal(config.mcpServers.paymos.env.PAYMOS_CREDENTIALS_FILE, credentialFile);
assert(!readFileSync(clientConfig, "utf8").includes(secret));
assert.equal(JSON.parse(readFileSync(credentialFile, "utf8")).apiSecret, secret);

// Local stdio handshake, list and signature verification; no API fetch is made.
const launcher = config.mcpServers.paymos;
const transport = new StdioClientTransport({ command: launcher.command, args: launcher.args, cwd: temp,
  env: launcher.env, stderr: "pipe" });
let stderr = "";
transport.stderr?.on("data", chunk => { stderr += String(chunk); });
const client = new Client({ name: "paymos-offline-package-check", version: "1.0.0" });
try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(tools, ["cancel_invoice", "create_invoice", "get_invoice", "list_invoices", "simulate_invoice_payment", "verify_webhook_signature"]);
  assert.equal((await client.listResources()).resources.length, 5);
  const payload = '{"event_id":"evt_local"}';
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest("hex");
  const result = await client.callTool({ name: "verify_webhook_signature", arguments: {
    payload, signature_header: `t=${timestamp},v1=${digest}`,
  } });
  assert.deepEqual(JSON.parse(result.content[0].text), { valid: true });
} finally {
  await client.close();
}
assert.match(stderr, /sandbox session ready/);
assert(!stderr.includes(secret) && !stderr.includes(webhookSecret));
console.log(JSON.stringify({ packageSmoke: "pass", tools: 6, resources: 5, privateFile: true,
  installedBinSetup: "pass", configuredLauncher: "pass", repeat: "pass", help: "pass", signatureFromFile: "pass", networkTests: "not run" }));
