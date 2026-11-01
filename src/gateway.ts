/**
 * The single door to the Paymos Merchant API. Tools never import `@paymos/sdk`
 * or build a client themselves: they ask the gateway, which re-runs the sandbox
 * gate on every access. A tool added without any check of its own still cannot
 * reach the API with anything but a test key pair — the gate is a property of
 * the structure, not of each caller's discipline.
 */

import { Paymos, type Invoice } from "@paymos/sdk";
import type { PaymosMcpCredentials } from "./config.js";
import { checkCredentials } from "./gate.js";
import { ToolError } from "./errors.js";

/**
 * SDK 2.1.1 already forwards the simulator stage unchanged, but its declarations
 * predate the additive paid_late stage. Keep that wire contract explicit here
 * until the SDK declaration catches up. The packed-package test checks the
 * actual published runtime; no second HTTP/signing implementation is introduced.
 */
export type InvoicesSurface = Omit<Paymos["invoices"], "simulatePayment"> & {
  simulatePayment(invoiceId: string, stage: "paid" | "overpaid" | "underpay" | "cancel" | "paid_late"): Promise<Invoice>;
};

/** Test seam: injects a fetch mock without weakening the gate. */
export interface GatewayOverrides {
  readonly fetch?: typeof globalThis.fetch;
}

export class PaymosGateway {
  private readonly credentials: PaymosMcpCredentials;
  private readonly overrides: GatewayOverrides;

  constructor(credentials: PaymosMcpCredentials, overrides: GatewayOverrides = {}) {
    this.credentials = credentials;
    this.overrides = overrides;
  }

  check(): ReturnType<typeof checkCredentials> {
    return checkCredentials(this.credentials);
  }

  /** Webhook signing secret for the local `verify_webhook_signature` tool. */
  webhookSecret(): string | undefined {
    return this.credentials.webhookSecret;
  }

  private client(): Paymos {
    const check = this.check();
    if (!check.ok) throw new ToolError(check.code, check.message);
    return new Paymos({
      apiKey: this.credentials.apiKeyId,
      apiSecret: this.credentials.apiSecret,
      ...(this.overrides.fetch ? { fetch: this.overrides.fetch } : {}),
    });
  }

  invoices(): InvoicesSurface {
    return this.client().invoices;
  }

  paymentChannels(): Paymos["paymentChannels"] {
    return this.client().paymentChannels;
  }

  paymentChannelDeposits(): Paymos["paymentChannelDeposits"] {
    return this.client().paymentChannelDeposits;
  }
}
