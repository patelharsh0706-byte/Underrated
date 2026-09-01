"use server";

import { sponsorFieldsSchema, type SponsorFields } from "@/lib/sponsor-schema";

export interface SponsorCheckoutResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * TODO(dodo-payments): wire this to a real checkout session once Dodo
 * Payments is integrated — see createSubmissionCheckout in actions/creator.ts
 * for the pattern this will follow (pre-created fixed-price Product,
 * metadata carrying the sponsor payload, webhook creates the sponsorship row
 * only after payment confirms — never on this call). Until then this just
 * validates and reports the slot isn't purchasable yet.
 */
export async function createSponsorshipCheckout(
  input: SponsorFields,
): Promise<SponsorCheckoutResult> {
  const parsed = sponsorFieldsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  return {
    error: "Sponsorship payments aren't live yet — check back soon.",
  };
}
