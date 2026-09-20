"use server";

import { redirect } from "next/navigation";

import { checkoutInputSchema, type CheckoutInput } from "@/lib/creator-schema";
import { getCreatorByPaymentId, isUsernameTaken } from "@/lib/db/queries";

export interface SubmitCreatorResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/** Static Dodo Payments Payment Link. No API key needed to send someone here. */
const SUBMISSION_PAYMENT_LINK = "https://dodo.pe/submit";

/**
 * Validates the submission, then sends the creator to a static Dodo Payments
 * Payment Link.
 *
 * The link carries no per-submission metadata, which has a consequence worth
 * stating plainly: the `payment.succeeded` webhook has no `creator_data` to
 * read, so it returns early and **never inserts the creator row**. Nothing
 * downstream can recover from that on its own —
 * `/submit/success` looks the row up by `payment_id`, finds nothing, and
 * shows its polling state until it times out. A paid submission needs a human
 * to create the row (see `insertCreator` in db/queries.ts), and the fields
 * validated here are not persisted anywhere, so the only record of what was
 * submitted is whatever Dodo captured.
 *
 * The API-checkout version that closes this loop is in git history at
 * `d422c37` — restoring it needs `DODO_PAYMENTS_API_KEY` and
 * `DODO_PAYMENTS_WEBHOOK_KEY`, which is the only reason it isn't here. See
 * ARCHITECTURE.md § Payments and DECISIONS.md § 2026-09-11.
 */
export async function createSubmissionCheckout(
  input: CheckoutInput,
): Promise<SubmitCreatorResult> {
  const parsed = checkoutInputSchema.safeParse(input);
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

  // Still checked before payment — never charge for a username that's taken.
  if (await isUsernameTaken(parsed.data.username)) {
    return { error: "That username is taken.", fieldErrors: { username: "Already taken" } };
  }

  redirect(SUBMISSION_PAYMENT_LINK);
}

/** Polled by /submit/success while the webhook is still landing. */
export async function checkSubmissionStatus(
  paymentId: string,
): Promise<{ username: string } | null> {
  return getCreatorByPaymentId(paymentId);
}
