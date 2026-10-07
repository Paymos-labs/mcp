/**
 * Presentation-only serialization: SDK objects come back in camelCase, the tool
 * contracts are frozen in the API's wire shape (snake_case). This is a key-case
 * formatter and nothing more — signing and HTTP stay in `@paymos/sdk`.
 */

export function toWireShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toWireShape);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = toWireShape(item);
  }
  return out;
}
