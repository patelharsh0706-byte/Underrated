import { z } from "zod";

// Shared between the submit Server Action and the Dodo Payments webhook, which
// re-validates this same shape from session metadata — never trust a
// webhook payload beyond its signature.

export const ALLOWED_SOCIALS = [
  "twitter",
  "instagram",
  "youtube",
  "spotify",
  "tiktok",
  "linkedin",
  "github",
] as const;

export const creatorFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(30)
    .regex(/^[a-z0-9_.]+$/, "Lowercase letters, numbers, . and _ only"),
  bio: z.string().trim().max(140).optional(),
  category: z.string().trim().min(1, "Pick a category"),
  workUrl: z.url("Enter a valid URL"),
  socials: z
    .record(z.enum(ALLOWED_SOCIALS), z.url())
    .refine((obj) => Object.keys(obj).length > 0, "Add at least one social link"),
  primarySocial: z.string().min(1, "Pick your primary social"),
  followerCount: z.coerce.number().int().min(0).optional(),
});

export const MIN_FEE_CENTS = 100; // $1
export const MAX_FEE_CENTS = 100_000; // $1,000 — a sane cap, not a meaningful one

export const checkoutInputSchema = creatorFieldsSchema
  .extend({
    amountCents: z
      .number()
      .int()
      .min(MIN_FEE_CENTS, "Minimum is $1")
      .max(MAX_FEE_CENTS, "That's more than we'll take — try a smaller amount"),
  })
  .refine((data) => Object.keys(data.socials).includes(data.primarySocial), {
    message: "Primary social must be one you added a link for",
    path: ["primarySocial"],
  });

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
