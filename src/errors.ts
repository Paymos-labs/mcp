import { ApiError } from "@paymos/sdk";

/**
 * Tool-level failure surfaced to the agent as `{ code, message }`. The code is
 * `paymos/<api_error_code>` for API answers (per the error catalogue), a gate
 * code for credential refusals, or `paymos/sdk_error` for transport failures.
 * Message text comes from the API problem details and never embeds the secret.
 */
export class ToolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export function toolErrorFrom(error: unknown): ToolError {
  if (error instanceof ToolError) return error;
  if (error instanceof ApiError) {
    const code = error.code === "" ? "api_error" : error.code;
    return new ToolError(`paymos/${code}`, error.message);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ToolError("paymos/sdk_error", message);
}
