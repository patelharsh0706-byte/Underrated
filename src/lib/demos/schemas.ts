import { z } from "zod";

import { MAX_DEMO_BYTES, MAX_DEMO_SECONDS } from "./check-clip";

// Zod rules for every Demos mutation (AGENTS.md: validate mutations with Zod).
// Shared by the Server Actions and their tests.

export const DEMO_CATEGORIES = ["Dev tools", "Creator tools", "Productivity", "Finance"] as const;
export type DemoCategory = (typeof DEMO_CATEGORIES)[number];

/** Accepts "yourproduct.com" or a full URL; always stores https://… */
const productUrl = z
  .string()
  .trim()
  .min(1, "Add your product URL.")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.url({ protocol: /^https?$/, hostname: /\./, error: "That URL looks off — try something like https://yourproduct.com" }))
  .transform((v) => v.replace(/^http:\/\//i, "https://"));

export const createDemoSchema = z.object({
  productName: z.string().trim().min(1, "Give the product a name.").max(40),
  tagline: z.string().trim().min(1, "Add a one-line tagline — what does it do?").max(60),
  productUrl,
  category: z.enum(DEMO_CATEGORIES, { error: "Pick a category." }),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email({ error: "That email looks off — check for a typo." })),
  videoUrl: z.url(),
  videoBytes: z.number().int().positive().max(MAX_DEMO_BYTES),
  videoWidth: z.number().int().nonnegative().nullable(),
  videoHeight: z.number().int().nonnegative().nullable(),
  durationMs: z.number().int().positive().max((MAX_DEMO_SECONDS + 0.5) * 1000),
});
export type CreateDemoInput = z.input<typeof createDemoSchema>;

export const judgeDemoSchema = z.object({
  demoId: z.uuid(),
  verdict: z.enum(["underhyped", "not_yet"]),
});

export const clickDemoSchema = z.object({ demoId: z.uuid() });

/** Only our own Blob store's demos/ folder, MP4/WebM. */
export function isOurDemoBlob(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith("/demos/");
  } catch {
    return false;
  }
}
