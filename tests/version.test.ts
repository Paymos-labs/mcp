import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MCP_VERSION } from "../src/version.js";

const here = fileURLToPath(new URL(".", import.meta.url));

describe("package version", () => {
  it("src/version.ts tracks package.json", () => {
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as { version: string };
    expect(MCP_VERSION).toBe(pkg.version);
  });
});
