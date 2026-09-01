import "server-only";

import DodoPayments from "dodopayments";

import { dodoEnv } from "@/lib/env";

let cachedClient: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!cachedClient) {
    const env = dodoEnv();
    cachedClient = new DodoPayments({
      bearerToken: env.DODO_PAYMENTS_API_KEY,
      webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
      environment: env.DODO_PAYMENTS_ENVIRONMENT,
    });
  }
  return cachedClient;
}
