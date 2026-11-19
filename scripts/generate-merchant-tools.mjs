/**
 * Generates src/generated/merchant-tools.ts from scripts/merchant-tools-catalog.json.
 * Deterministic: same catalog in, same file out.
 *
 * In an external mirror where scripts/merchant-tools-catalog.json is absent,
 * keeps the committed src/generated/merchant-tools.ts (exit 0) if present.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultCatalog = resolve(here, "merchant-tools-catalog.json");
const catalogPath = process.env.PAYMOS_MERCHANT_TOOLS_CATALOG ?? defaultCatalog;
const outFile = process.env.PAYMOS_MERCHANT_TOOLS_OUT ?? resolve(here, "..", "src", "generated", "merchant-tools.ts");

function fail(message) {
  console.error(`[generate-merchant-tools] ${message}`);
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (error) {
  if (process.env.PAYMOS_MERCHANT_TOOLS_CATALOG === undefined && !existsSync(catalogPath)) {
    const committed = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
    if (committed.includes("MERCHANT_TOOLS")) {
      console.log(`[generate-merchant-tools] catalog absent (${catalogPath}); keeping committed merchant tools`);
      process.exit(0);
    }
    fail(`catalog not found and no committed merchant tools exist at ${outFile}: ${error.message}`);
  }
  fail(`cannot read merchant tools catalog at ${catalogPath}: ${error.message}`);
}

if (!Array.isArray(catalog) || catalog.length === 0) {
  fail(`catalog at ${catalogPath} must be a non-empty JSON array.`);
}

const seenNames = new Set();
const normalized = catalog.map((tool, index) => {
  if (tool === null || typeof tool !== "object" || Array.isArray(tool)) {
    fail(`tool at index ${index} must be an object.`);
  }
  if (typeof tool.name !== "string" || tool.name.trim() === "") {
    fail(`tool at index ${index} has invalid name.`);
  }
  if (seenNames.has(tool.name)) {
    fail(`duplicate tool name "${tool.name}" at index ${index}.`);
  }
  seenNames.add(tool.name);
  if (typeof tool.description !== "string") {
    fail(`tool "${tool.name}" must have a string description.`);
  }
  if (tool.inputSchema === null || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) {
    fail(`tool "${tool.name}" must have an object inputSchema.`);
  }
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
});

const body = JSON.stringify(normalized, null, 2);
const source = `// GENERATED FILE — do not edit by hand. Regenerate with: npm run build:resources
// Source: scripts/merchant-tools-catalog.json (compiled from IMerchantMcpToolModule).

export interface MerchantToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const MERCHANT_TOOLS: readonly MerchantToolDefinition[] = ${body};
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, source, "utf8");
console.log(`[generate-merchant-tools] wrote ${normalized.length} merchant tools from ${catalogPath}`);
