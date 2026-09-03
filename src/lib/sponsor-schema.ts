import { z } from "zod";

// Shared between the sponsor Server Action and (once wired) the Dodo
// Payments webhook, which will re-validate this same shape from session
// metadata — never trust a webhook payload beyond its signature.
//
// No imageUrl field — the logo is derived from targetUrl via unavatar.io
// (see lib/unavatar.ts), not collected from the sponsor directly.
// logoRemoved is a real, persisted "no logo" choice — see DATABASE.md.
export const sponsorFieldsSchema = z.object({
  sponsorName: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(140).optional(),
  targetUrl: z.url("Enter a valid URL"),
  logoRemoved: z.boolean(),
});

export type SponsorFields = z.infer<typeof sponsorFieldsSchema>;
