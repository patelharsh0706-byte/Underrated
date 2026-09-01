import { z } from "zod";

// Shared between the sponsor Server Action and (once wired) the Dodo
// Payments webhook, which will re-validate this same shape from session
// metadata — never trust a webhook payload beyond its signature.
export const sponsorFieldsSchema = z.object({
  sponsorName: z.string().trim().min(1, "Name is required").max(80),
  imageUrl: z.url("Enter a valid image URL"),
  targetUrl: z.url("Enter a valid URL"),
});

export type SponsorFields = z.infer<typeof sponsorFieldsSchema>;
