import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const here = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = resolve(here, "..");

const REMOTE_MCP_URL = "https://app.paymos.io/connect/merchant-mcp";
const EXPECTED_MCP_NAME = "io.paymos/mcp";
const EXPECTED_HOMEPAGE = "https://paymos.io/docs/mcp";
const EXPECTED_REPOSITORY = "https://github.com/Paymos-labs/mcp";
const EXPECTED_SERVER_SCHEMA = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

const ROOT_PLUGIN_ALLOWED_KEYS = [
  "author",
  "description",
  "displayName",
  "homepage",
  "logo",
  "name",
  "repository",
  "suggestedPrompts",
  "version",
] as const;

const EXPECTED_SKILLS = [
  "paymos-integrate",
  "paymos-webhooks",
  "paymos-sandbox",
  "paymos-workspace",
] as const;

const REQUIRED_PACK_ROOT_FILES = [
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
] as const;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJsonObject(relPath: string): JsonObject {
  const fullPath = resolve(packageRoot, relPath);
  expect(existsSync(fullPath), `Expected JSON manifest to exist: ${relPath}`).toBe(true);
  const parsed: unknown = JSON.parse(readFileSync(fullPath, "utf8"));
  expect(isJsonObject(parsed), `Expected JSON object in ${relPath}`).toBe(true);
  return parsed as JsonObject;
}

function readPackageVersion(): string {
  const pkg = readJsonObject("package.json");
  expect(typeof pkg.version).toBe("string");
  return pkg.version as string;
}

function assertRelativeTargetExists(relTarget: string, expectedType?: "file" | "dir"): void {
  const resolved = resolve(packageRoot, relTarget);
  const relFromRoot = relative(packageRoot, resolved);
  expect(
    relFromRoot === "" || (!relFromRoot.startsWith("..") && !isAbsolute(relFromRoot)),
    `Relative target "${relTarget}" must stay within plugins/mcp`,
  ).toBe(true);
  expect(existsSync(resolved), `Referenced relative target does not exist: ${relTarget}`).toBe(true);
  if (expectedType === "file") {
    expect(statSync(resolved).isFile(), `Expected file at ${relTarget}`).toBe(true);
  }
  if (expectedType === "dir") {
    expect(statSync(resolved).isDirectory(), `Expected directory at ${relTarget}`).toBe(true);
  }
}

function findAllSkillFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findAllSkillFiles(fullPath));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      found.push(relative(packageRoot, fullPath).replace(/\\/g, "/"));
    }
  }
  return found.sort();
}

function parseYamlFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  expect(match, "Expected valid YAML frontmatter delimited by ---").not.toBeNull();
  const block = match?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const colonIndex = line.indexOf(":");
    expect(colonIndex, `Invalid YAML frontmatter line: ${line}`).toBeGreaterThan(0);
    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    const unquoted =
      (rawValue.startsWith("\"") && rawValue.endsWith("\""))
      || (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    fields[key] = unquoted;
  }
  return fields;
}

describe("multi-AI plugin wrapper manifests & package contract (pw-01)", () => {
  it("package.json preserves npm packaging boundary and declares mcpName", () => {
    const pkg = readJsonObject("package.json");
    expect(pkg.name).toBe("@paymos/mcp");
    expect(pkg.mcpName).toBe(EXPECTED_MCP_NAME);
    expect(typeof pkg.version).toBe("string");
    expect(pkg.version as string).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    expect(pkg.files).toEqual(["dist", "README.md", "LICENSE", "CHANGELOG.md"]);
    expect(typeof pkg.description).toBe("string");
    expect(pkg.description as string).toMatch(/multi-AI plugin wrapper/i);
    expect(pkg.description as string).toContain("188");
  });

  it("root plugin.json obeys strict 9-key Antigravity & Agent Plugins 1.0 allowlist", () => {
    const pkgVersion = readPackageVersion();
    const manifest = readJsonObject("plugin.json");
    expect(Object.keys(manifest).sort()).toEqual([...ROOT_PLUGIN_ALLOWED_KEYS]);
    expect(manifest.name).toBe("paymos");
    expect(manifest.displayName).toBe("Paymos");
    expect(manifest.version).toBe(pkgVersion);
    expect(manifest.logo).toBe("assets/logo.svg");
    assertRelativeTargetExists("assets/logo.svg", "file");
    expect(readFileSync(resolve(packageRoot, "assets/logo.svg"), "utf8")).toContain("<svg");

    expect(Array.isArray(manifest.suggestedPrompts)).toBe(true);
    const prompts = manifest.suggestedPrompts as unknown[];
    expect(prompts.length).toBe(3);
    for (const prompt of prompts) {
      expect(typeof prompt).toBe("string");
      expect((prompt as string).trim().length).toBeGreaterThan(10);
    }

    expect(manifest.author).toEqual({ name: "Paymos Labs", url: "https://paymos.io" });
    expect(manifest.homepage).toBe(EXPECTED_HOMEPAGE);
    expect(manifest.repository).toBe(EXPECTED_REPOSITORY);
  });

  it("remote MCP configs (.mcp.json, mcp.json, mcp_config.json) point to canonical Streamable HTTP URL", () => {
    const dotMcp = readJsonObject(".mcp.json");
    expect(dotMcp).toEqual({
      mcpServers: {
        paymos: {
          type: "http",
          url: REMOTE_MCP_URL,
        },
      },
    });

    const mcpJson = readJsonObject("mcp.json");
    expect(mcpJson).toEqual({
      mcpServers: {
        paymos: {
          type: "http",
          url: REMOTE_MCP_URL,
        },
      },
    });

    const mcpConfig = readJsonObject("mcp_config.json");
    expect(mcpConfig).toEqual({
      mcpServers: {
        paymos: {
          url: REMOTE_MCP_URL,
        },
      },
    });
  });

  it("gemini-extension.json configures httpUrl, OAuth, version, and rules/AGENTS.md", () => {
    const pkgVersion = readPackageVersion();
    const manifest = readJsonObject("gemini-extension.json");
    expect(manifest.name).toBe("paymos");
    expect(manifest.version).toBe(pkgVersion);
    expect(typeof manifest.description).toBe("string");
    expect(manifest.contextFileName).toBe("rules/AGENTS.md");
    assertRelativeTargetExists("rules/AGENTS.md", "file");
    expect(manifest.mcpServers).toEqual({
      paymos: {
        httpUrl: REMOTE_MCP_URL,
        oauth: {
          enabled: true,
        },
      },
    });
  });

  it("server.json follows Official MCP Registry 2025-12-11 schema", () => {
    const pkgVersion = readPackageVersion();
    const manifest = readJsonObject("server.json");
    expect(manifest.$schema).toBe(EXPECTED_SERVER_SCHEMA);
    expect(manifest.name).toBe(EXPECTED_MCP_NAME);
    expect(manifest.version).toBe(pkgVersion);
    expect(typeof manifest.description).toBe("string");
    expect((manifest.description as string).length).toBeLessThanOrEqual(100);
    expect(manifest.repository).toEqual({
      url: EXPECTED_REPOSITORY,
      source: "github",
    });
    expect(manifest.websiteUrl).toBe(EXPECTED_HOMEPAGE);
    expect(manifest.packages).toEqual([
      {
        registryType: "npm",
        identifier: "@paymos/mcp",
        version: pkgVersion,
        transport: { type: "stdio" },
        packageArguments: [{ type: "positional", value: "connect" }],
      },
    ]);
    expect(manifest.remotes).toEqual([
      {
        type: "streamable-http",
        url: REMOTE_MCP_URL,
      },
    ]);
  });

  it("Claude Code marketplace and plugin manifests match schema and paths", () => {
    const pkgVersion = readPackageVersion();
    const marketplace = readJsonObject(".claude-plugin/marketplace.json");
    expect(marketplace.name).toBe("paymos");
    expect(marketplace.owner).toEqual({ name: "Paymos Labs", email: "support@paymos.io" });
    expect(isJsonObject(marketplace.metadata)).toBe(true);
    expect((marketplace.metadata as JsonObject).version).toBe(pkgVersion);

    expect(Array.isArray(marketplace.plugins)).toBe(true);
    const entries = marketplace.plugins as JsonObject[];
    expect(entries.length).toBe(1);
    const entry = entries[0];
    expect(entry).toBeDefined();
    expect(entry?.name).toBe("paymos");
    expect(entry?.source).toBe("./");
    expect(entry?.version).toBe(pkgVersion);
    assertRelativeTargetExists("./", "dir");

    const plugin = readJsonObject(".claude-plugin/plugin.json");
    expect(plugin.name).toBe("paymos");
    expect(plugin.version).toBe(pkgVersion);
    expect(plugin.license).toBe("MIT");
    expect(plugin.homepage).toBe(EXPECTED_HOMEPAGE);
    expect(plugin.repository).toBe(EXPECTED_REPOSITORY);
    expect(plugin.skills).toBe("./skills/");
    expect(plugin.mcpServers).toBe("./.mcp.json");
    assertRelativeTargetExists("./skills/", "dir");
    assertRelativeTargetExists("./.mcp.json", "file");
  });

  it("OpenAI Codex marketplace has official unversioned schema and plugin uses native top-level interface", () => {
    const pkgVersion = readPackageVersion();
    const marketplace = readJsonObject(".agents/plugins/marketplace.json");
    expect(marketplace.name).toBe("paymos");
    expect(marketplace.interface).toEqual({ displayName: "Paymos" });
    expect("version" in marketplace).toBe(false);
    expect("repository" in marketplace).toBe(false);
    expect("installType" in marketplace).toBe(false);
    expect("entry" in marketplace).toBe(false);

    expect(Array.isArray(marketplace.plugins)).toBe(true);
    const entries = marketplace.plugins as JsonObject[];
    expect(entries.length).toBe(1);
    const entry = entries[0];
    expect(entry).toBeDefined();
    expect("version" in (entry ?? {})).toBe(false);
    expect(entry).toEqual({
      name: "paymos",
      source: { source: "local", path: "./" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer Tools",
    });
    assertRelativeTargetExists("./", "dir");

    const plugin = readJsonObject(".codex-plugin/plugin.json");
    expect(plugin.name).toBe("paymos");
    expect(plugin.version).toBe(pkgVersion);
    expect("extensions" in plugin).toBe(false);
    expect(plugin.skills).toBe("./skills/");
    expect(plugin.mcpServers).toBe("./.mcp.json");
    assertRelativeTargetExists("./skills/", "dir");
    assertRelativeTargetExists("./.mcp.json", "file");

    expect(isJsonObject(plugin.interface)).toBe(true);
    const ui = plugin.interface as JsonObject;
    expect(ui.displayName).toBe("Paymos");
    expect(typeof ui.shortDescription).toBe("string");
    expect(typeof ui.longDescription).toBe("string");
    expect(ui.developerName).toBe("Paymos Labs");
    expect(ui.category).toBe("Developer Tools");
    expect(ui.capabilities).toEqual(["Interactive", "Read", "Write"]);
    expect(ui.websiteURL).toBe("https://paymos.io");
    expect(ui.privacyPolicyURL).toBe("https://paymos.io/privacy");
    expect(ui.termsOfServiceURL).toBe("https://paymos.io/terms");
    expect(ui.composerIcon).toBe("./assets/logo.svg");
    expect(ui.logo).toBe("./assets/logo.svg");
    assertRelativeTargetExists("./assets/logo.svg", "file");
    expect(Array.isArray(ui.defaultPrompt)).toBe(true);
    expect((ui.defaultPrompt as unknown[]).length).toBe(3);
  });

  it("Cursor and GitHub Copilot CLI manifests match schemas and existing targets", () => {
    const pkgVersion = readPackageVersion();
    const cursor = readJsonObject(".cursor-plugin/plugin.json");
    expect(cursor.name).toBe("paymos");
    expect(cursor.version).toBe(pkgVersion);
    expect(cursor.skills).toBe("./skills/");
    expect(cursor.rules).toBe("./rules/");
    expect(cursor.mcpServers).toBe("./mcp.json");
    assertRelativeTargetExists("./skills/", "dir");
    assertRelativeTargetExists("./rules/", "dir");
    assertRelativeTargetExists("./mcp.json", "file");

    const ghMarketplace = readJsonObject(".github/plugin/marketplace.json");
    expect(ghMarketplace.name).toBe("paymos");
    expect(ghMarketplace.owner).toEqual({ name: "Paymos Labs", email: "support@paymos.io" });
    expect(typeof ghMarketplace.description).toBe("string");
    expect(Array.isArray(ghMarketplace.plugins)).toBe(true);
    const ghEntries = ghMarketplace.plugins as JsonObject[];
    expect(ghEntries.length).toBe(1);
    const ghEntry = ghEntries[0];
    expect(ghEntry?.name).toBe("paymos");
    expect(ghEntry?.source).toBe("./");
    expect(ghEntry?.version).toBe(pkgVersion);
    assertRelativeTargetExists("./", "dir");

    const ghPlugin = readJsonObject(".github/plugin/plugin.json");
    expect(ghPlugin.name).toBe("paymos");
    expect(ghPlugin.version).toBe(pkgVersion);
    expect(ghPlugin.skills).toBe("./skills");
    expect(ghPlugin.mcpServers).toBe("./.mcp.json");
    assertRelativeTargetExists("./skills", "dir");
    assertRelativeTargetExists("./.mcp.json", "file");
  });

  it("all 9 versioned manifests stay synchronized with package.json version", () => {
    const pkgVersion = readPackageVersion();
    const directVersioned = [
      "plugin.json",
      "gemini-extension.json",
      "server.json",
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
      ".cursor-plugin/plugin.json",
      ".github/plugin/plugin.json",
    ] as const;

    for (const relPath of directVersioned) {
      expect(readJsonObject(relPath).version, `Version mismatch in ${relPath}`).toBe(pkgVersion);
    }

    const serverJson = readJsonObject("server.json");
    for (const item of serverJson.packages as JsonObject[]) {
      expect(item.version, "Version mismatch in server.json packages[]").toBe(pkgVersion);
    }

    const claudeMarket = readJsonObject(".claude-plugin/marketplace.json");
    expect((claudeMarket.metadata as JsonObject).version).toBe(pkgVersion);
    for (const item of claudeMarket.plugins as JsonObject[]) {
      expect(item.version, "Version mismatch in .claude-plugin/marketplace.json plugins[]").toBe(pkgVersion);
    }

    const ghMarket = readJsonObject(".github/plugin/marketplace.json");
    for (const item of ghMarket.plugins as JsonObject[]) {
      expect(item.version, "Version mismatch in .github/plugin/marketplace.json plugins[]").toBe(pkgVersion);
    }
  });

  it("contains no root AGENTS.md or CLAUDE.md and keeps rules under rules/", () => {
    expect(existsSync(resolve(packageRoot, "AGENTS.md"))).toBe(false);
    expect(existsSync(resolve(packageRoot, "CLAUDE.md"))).toBe(false);

    assertRelativeTargetExists("rules/AGENTS.md", "file");
    assertRelativeTargetExists("rules/paymos.mdc", "file");

    const mdcContent = readFileSync(resolve(packageRoot, "rules/paymos.mdc"), "utf8");
    const mdcFrontmatter = parseYamlFrontmatter(mdcContent);
    expect((mdcFrontmatter.description ?? "").length).toBeGreaterThan(15);
  });

  it("npm pack --dry-run --json --ignore-scripts strictly enforces runtime-only tarball allowlist", async () => {
    const npmExecPath = process.env.npm_execpath;
    const useNodeDirect = typeof npmExecPath === "string" && npmExecPath.endsWith(".js") && existsSync(npmExecPath);
    const bin = useNodeDirect ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
    const args = useNodeDirect
      ? [npmExecPath, "pack", "--dry-run", "--json", "--ignore-scripts"]
      : ["pack", "--dry-run", "--json", "--ignore-scripts"];
    const { stdout } = await execFileAsync(bin, args, {
      cwd: packageRoot,
      encoding: "utf8",
      shell: !useNodeDirect && process.platform === "win32",
      env: {
        ...process.env,
        npm_config_update_notifier: "false",
        npm_config_fund: "false",
        npm_config_audit: "false",
      },
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed: unknown = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    const packReport = (parsed as Array<{ files?: Array<{ path?: string }> }>)[0];
    expect(packReport).toBeDefined();

    const packedPaths = (packReport?.files ?? [])
      .map(file => (file.path ?? "").replace(/\\/g, "/"))
      .filter(Boolean);

    expect(packedPaths.length).toBeGreaterThanOrEqual(REQUIRED_PACK_ROOT_FILES.length);

    for (const requiredFile of REQUIRED_PACK_ROOT_FILES) {
      expect(packedPaths, `Missing required tarball root file: ${requiredFile}`).toContain(requiredFile);
    }

    if (existsSync(join(packageRoot, "dist"))) {
      expect(packedPaths).toContain("dist/index.js");
    }

    for (const packedPath of packedPaths) {
      const allowed =
        (REQUIRED_PACK_ROOT_FILES as readonly string[]).includes(packedPath)
        || packedPath.startsWith("dist/");
      expect(allowed, `Disallowed file leaked into npm tarball: ${packedPath}`).toBe(true);
    }
  }, 60_000);
});

describe("cross-platform Paymos Agent Skills & rules truth (pw-02)", () => {
  it("contains exactly 4 SKILL.md files across plugins/mcp with valid YAML frontmatter", () => {
    const discovered = findAllSkillFiles(packageRoot);
    const expectedPaths = EXPECTED_SKILLS.map(name => `skills/${name}/SKILL.md`).sort();
    expect(discovered).toEqual(expectedPaths);

    for (const skillName of EXPECTED_SKILLS) {
      const content = readFileSync(resolve(packageRoot, "skills", skillName, "SKILL.md"), "utf8");
      const frontmatter = parseYamlFrontmatter(content);
      expect(frontmatter.name).toBe(skillName);
      expect((frontmatter.description ?? "").length).toBeGreaterThan(25);
    }
  });

  it("enforces Paymos product truth and zero phantom or internal-provider leaks across all skills and rules", () => {
    const filesToCheck = [
      "rules/AGENTS.md",
      "rules/paymos.mdc",
      ...EXPECTED_SKILLS.map(name => `skills/${name}/SKILL.md`),
    ];

    const forbiddenPatterns: ReadonlyArray<{ label: string; pattern: RegExp }> = [
      { label: "phantom invoice.created event", pattern: /invoice\.created/i },
      { label: "phantom invoice.token_selected event", pattern: /invoice\.token_selected/i },
      { label: "phantom invoice status new", pattern: /`new`|\bstatus\s*[:=]\s*["']?new["']?/i },
      { label: "calling XAUT a stablecoin (5 stablecoins)", pattern: /\b(?:5|five)\s+stablecoins\b/i },
      { label: "calling XAUT a stablecoin (direct)", pattern: /\bXAUT\s+is\s+a\s+stablecoin\b|\bstablecoin\s+XAUT\b/i },
      { label: "grouping XAUT inside stablecoins list", pattern: /\bstablecoins?\s*\([^)]*\bXAUT\b/i },
      { label: "internal 1Click provider mention", pattern: /\b1click\b|\boneclick\b/i },
      { label: "internal NEAR Intents provider mention", pattern: /\bnear\s+intents\b|\bnearintents\b/i },
    ];

    for (const relPath of filesToCheck) {
      const content = readFileSync(resolve(packageRoot, relPath), "utf8");
      for (const { label, pattern } of forbiddenPatterns) {
        expect(content, `${relPath} must not contain ${label}`).not.toMatch(pattern);
      }
    }

    const integrate = readFileSync(resolve(packageRoot, "skills/paymos-integrate/SKILL.md"), "utf8");
    for (const token of ["USDT", "USDC", "USD1", "DAI", "XAUT", "gold-backed", "13", "11", "NEAR", "SUI", "45", "12", "PaymosWidget.mount", "install-secret"]) {
      expect(integrate, `paymos-integrate must mention ${token}`).toContain(token);
    }

    const webhooks = readFileSync(resolve(packageRoot, "skills/paymos-webhooks/SKILL.md"), "utf8");
    for (const token of [
      "X-Webhook-Signature",
      "v1=",
      "event_id",
      "X-Webhook-Id",
      "\"version\": 1",
      "invoice.awaiting_payment",
      "invoice.confirming",
      "invoice.paid",
      "invoice.paid_over",
      "invoice.underpaid",
      "invoice.underpaid_waiting",
      "invoice.expired",
      "invoice.cancelled",
      "invoice.paid_late",
      "payment_channel.deposit.confirming",
      "payment_channel.deposit.confirmed",
      "payment_channel.deposit.reorged",
      "withdrawal.completion_rewound",
      "is_final",
      "GET /v1/invoices/{id}",
    ]) {
      expect(webhooks, `paymos-webhooks must mention ${token}`).toContain(token);
    }
    expect(webhooks, "Webhook envelope version must be integer 1, not string \"1\"").not.toMatch(/"version"\s*:\s*"1"/);
    expect(webhooks, "invoice.awaiting_payment must be documented as deep-reorg regression, not initial asset selection")
      .not.toMatch(/invoice\.awaiting_payment`?\s*[—-]\s*payer selected/i);
    expect(webhooks).toMatch(/invoice\.awaiting_payment[\s\S]{0,160}reorg/i);

    const sandbox = readFileSync(resolve(packageRoot, "skills/paymos-sandbox/SKILL.md"), "utf8");
    for (const token of [
      "POST /v1/sandbox/invoices/{id}/simulate-payment",
      "environment: \"Sandbox\"",
      "paid",
      "paid_late",
      "overpaid",
      "underpay",
      "cancel",
      "confirming",
      "reorged",
      "confirmed",
      "Sandbox",
      "Production",
    ]) {
      expect(sandbox, `paymos-sandbox must mention ${token}`).toContain(token);
    }
    expect(sandbox, "Must not reference nonexistent /simulate route without -payment suffix")
      .not.toMatch(/\/v1\/sandbox\/invoices\/\{id\}\/simulate(?![-a-z])/i);
    expect(sandbox, "MCP tool environment enum is PascalCase Sandbox/Production, not lowercase \"sandbox\"")
      .not.toMatch(/environment:\s*"sandbox"/);

    const workspace = readFileSync(resolve(packageRoot, "skills/paymos-workspace/SKILL.md"), "utf8");
    for (const token of [
      "Owner",
      "Admin",
      "Finance",
      "Developer",
      "Custom",
      "\"Production\"",
      "\"Sandbox\"",
      "user_action_required",
      "continue_url",
      "operation_id",
      "otk_",
      "ftk_",
      "file_ticket",
      "Dashboard",
    ]) {
      expect(workspace, `paymos-workspace must mention ${token}`).toContain(token);
    }
    expect(workspace, "Upload metadata belongs at top-level input, not inside delivery")
      .not.toMatch(/byte_length,\s*content_sha256,\s*and\s*content_type\s+in\s+`?delivery`?/i);
    expect(workspace, "MCP tool environment enum is PascalCase Sandbox/Production, not lowercase")
      .not.toMatch(/environment:\s*"(?:sandbox|production)"/);
  });
});

describe("README canonical multi-AI plugin install commands (pw-05)", () => {
  it("includes every canonical plugin install command, 4 skills, and preserves CLI setup docs", () => {
    const readme = readFileSync(resolve(packageRoot, "README.md"), "utf8");
    const requiredSnippets = [
      "claude plugin marketplace add Paymos-labs/mcp && claude plugin install paymos@paymos",
      "codex plugin marketplace add Paymos-labs/mcp",
      "agy plugin install https://github.com/Paymos-labs/mcp.git",
      "gemini extensions install https://github.com/Paymos-labs/mcp",
      "copilot plugin marketplace add Paymos-labs/mcp && copilot plugin install paymos@paymos",
      "npx skills add Paymos-labs/mcp",
      ".cursor-plugin/plugin.json",
      "npx -y @paymos/mcp setup --client cursor",
      "npx -y @paymos/mcp setup",
      REMOTE_MCP_URL,
      "paymos-integrate",
      "paymos-webhooks",
      "paymos-sandbox",
      "paymos-workspace",
      "install-secret",
      "--sandbox",
    ];

    for (const snippet of requiredSnippets) {
      expect(readme, `README.md must include "${snippet}"`).toContain(snippet);
    }

    expect(readme).not.toContain("npx codex-marketplace");
  });
});
