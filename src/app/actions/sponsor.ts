"use server";

import { redirect } from "next/navigation";

import { sponsorFieldsSchema, type SponsorFields } from "@/lib/sponsor-schema";

export interface SponsorCheckoutResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * TODO(dodo-payments): sends the sponsor to a static Dodo Payments Payment
 * Link (https://dodo.pe/sponsor-underhyped) instead of an API-created
 * checkout session with metadata — a deliberate, temporary bridge until the
 * real product/API integration is wired up. This means the payment is NOT
 * correlated to this specific submission: nothing here creates the
 * sponsorship row, and there is no webhook handling for sponsor payments
 * yet at all (unlike creators, which at least have a dormant webhook route
 * waiting for metadata) — so a paid sponsorship currently needs a human to
 * insert the row afterward (see the `sponsorships` table, DATABASE.md).
 *
 * Once a real Product + API checkout session replaces this static link,
 * pass the validated sponsor payload through the session's metadata and add
 * webhook handling that inserts the row — matching the pattern in
 * actions/creator.ts and api/dodo-payments/webhook/route.ts. See
 * ARCHITECTURE.md § Payments.
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

  redirect("https://dodo.pe/sponsor-underhyped");
}
