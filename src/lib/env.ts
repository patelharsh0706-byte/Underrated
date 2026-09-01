import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export function clientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must never be called from the client");
  }
  cachedServerEnv ??= serverSchema.parse(process.env);
  return cachedServerEnv;
}

// Validated separately from serverEnv() — Dodo Payments keys aren't needed
// for the core battle loop, so a missing key here shouldn't break the whole
// app. Only throws when a payment flow (submission fee, sponsor slot) is
// actually used.
const dodoSchema = z.object({
  DODO_PAYMENTS_API_KEY: z
    .string()
    .min(1, "Dodo Payments is not configured (DODO_PAYMENTS_API_KEY missing)"),
  DODO_PAYMENTS_WEBHOOK_KEY: z
    .string()
    .min(1, "Dodo Payments webhook key is not configured (DODO_PAYMENTS_WEBHOOK_KEY missing)"),
  DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
  DODO_PAYMENTS_SUBMISSION_PRODUCT_ID: z
    .string()
    .min(1, "No submission product configured (DODO_PAYMENTS_SUBMISSION_PRODUCT_ID missing)"),
});

let cachedDodoEnv: z.infer<typeof dodoSchema> | null = null;

export function dodoEnv() {
  if (typeof window !== "undefined") {
    throw new Error("dodoEnv() must never be called from the client");
  }
  cachedDodoEnv ??= dodoSchema.parse(process.env);
  return cachedDodoEnv;
}
