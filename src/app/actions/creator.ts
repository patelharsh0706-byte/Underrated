"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SUBMISSION_FEE_CENTS, checkoutInputSchema, type CheckoutInput } from "@/lib/creator-schema";
import { getCreatorByPaymentId, insertCreator, isUsernameTaken } from "@/lib/db/queries";

export interface SubmitCreatorResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * TODO(dodo-payments): this inserts the creator row directly and skips
 * payment entirely — a deliberate, temporary bridge so the submit → success
 * loop is visible before Dodo is wired. Nothing is deployed yet, so there's
 * no real-user exposure; revisit before any real launch.
 *
 * Once Dodo is wired, replace the body below with a real checkout session
 * (pre-created fixed-price Product, metadata carrying the creator payload,
 * redirect to session.checkout_url) and let the webhook
 * (api/dodo-payments/webhook/route.ts) do the insert via insertCreator —
 * exactly like createSponsorshipCheckout / the sponsor flow still does
 * pending its own Dodo wiring. See ARCHITECTURE.md § Payments.
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

  let created: { username: string } | null;
  try {
    created = await insertCreator(data, {
      entryFeeCents: SUBMISSION_FEE_CENTS,
      dodoPaymentId: `dev_${randomUUID()}`,
    });
  } catch (err) {
    console.error("Failed to insert creator (temporary no-payment bridge)", err);
    return { error: "That username was just taken. Try another." };
  }

  if (!created) {
    return { error: "Couldn't complete your submission. Try again in a moment." };
  }

  revalidatePath("/");
  revalidatePath("/leaderboard");
  redirect(`/c/${created.username}`);
}

/** Polled by /submit/success while the webhook is still landing. */
export async function checkSubmissionStatus(
  paymentId: string,
): Promise<{ username: string } | null> {
  return getCreatorByPaymentId(paymentId);
}
