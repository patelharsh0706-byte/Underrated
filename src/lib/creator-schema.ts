import { z } from "zod";

import { normalizeToUrlString } from "@/lib/unavatar";

// Shared between the submit Server Action and the Dodo Payments webhook, which
// re-validates this same shape from session metadata — never trust a
// webhook payload beyond its signature.

/**
 * z.url() requires a scheme (new URL() throws on a bare "www.site.com"), but
 * people naturally type domains without "https://". Prepends it when
 * missing, reusing the same normalization the profile-link field already
 * gets — falls back to the raw value so a genuinely invalid input still
 * surfaces the schema's own "Enter a valid URL" message.
 */
function normalizeUrlInput(val: unknown): unknown {
  if (typeof val !== "string") return val;
  return normalizeToUrlString(val) ?? val;
}

/**
 * The three V1 categories, singular because a category labels one person.
 * This is the only place they are defined — the submit chips, the leaderboard
 * filter and the schema below all read it, so the list cannot drift from the
 * values actually stored on creators. It did drift once, and every category
 * filter returned an empty board for weeks. See ISSUES.md § 2026-09-14 and
 * DECISIONS.md § 2026-09-14.
 */
export const CATEGORIES = ["Indie Developer", "Builder", "CEO/Founder"] as const;

export type Category = (typeof CATEGORIES)[number];

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
  // Enum, not a free string: this is what stops a new value being written that
  // no filter chip can ever match.
  category: z.enum(CATEGORIES, { error: "Pick a category" }),
  workUrl: z.preprocess(normalizeUrlInput, z.url("Enter a valid URL")),
  socials: z
    .partialRecord(z.enum(ALLOWED_SOCIALS), z.url())
    .refine((obj) => Object.keys(obj).length > 0, "Add at least one social link"),
  primarySocial: z.string().min(1, "Pick your primary social"),
  followerCount: z.coerce.number().int().min(0).optional(),
});

/**
 * Fixed price. Deliberately not accepted from the client — a client-supplied
 * amount could be tampered with to submit for less. The Server Action sets it.
 */
export const SUBMISSION_FEE_CENTS = 300; // $3

export const checkoutInputSchema = creatorFieldsSchema.refine(
  (data) => Object.keys(data.socials).includes(data.primarySocial),
  {
    message: "Primary social must be one you added a link for",
    path: ["primarySocial"],
  },
);

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CreatorFields = z.infer<typeof creatorFieldsSchema>;
