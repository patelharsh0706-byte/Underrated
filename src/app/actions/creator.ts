"use server";

import { redirect } from "next/navigation";

import { checkoutInputSchema, type CheckoutInput } from "@/lib/creator-schema";
import { getCreatorByPaymentId, isUsernameTaken } from "@/lib/db/queries";

export interface SubmitCreatorResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * TODO(dodo-payments): sends the creator to a static Dodo Payments Payment
 * Link (https://dodo.pe/submit) instead of an API-created checkout session
 * with metadata — a deliberate, temporary bridge until the real product/API
 * integration is wired up. This means the payment is NOT correlated to this
 * specific submission: nothing here creates the creator row, and the
 * webhook (api/dodo-payments/webhook/route.ts) has no submission metadata
 * to insert from, so a paid submission currently needs a human to create
 * the row afterward (see insertCreator in db/queries.ts).
 *
 * Once a real Product + API checkout session replaces this static link,
 * pass the validated creator payload through the session's metadata (as
 * `createSubmissionCheckout` used to before this bridge) so the webhook can
 * call insertCreator() automatically again. See ARCHITECTURE.md § Payments.
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

  const data = parsed.data;

  if (await isUsernameTaken(data.username)) {
    return { error: "That username is taken.", fieldErrors: { username: "Already taken" } };
  }

  redirect("https://dodo.pe/submit");
}

/** Polled by /submit/success while the webhook is still landing. */
export async function checkSubmissionStatus(
  paymentId: string,
): Promise<{ username: string } | null> {
  return getCreatorByPaymentId(paymentId);
}
