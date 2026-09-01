"use server";

import { redirect } from "next/navigation";

import { checkoutInputSchema, type CheckoutInput } from "@/lib/creator-schema";
import { clientEnv, dodoEnv } from "@/lib/env";
import { getCreatorByPaymentId, isUsernameTaken } from "@/lib/db/queries";
import { getDodoClient } from "@/lib/dodo-payments";

export interface SubmitCreatorResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * Creates a Dodo Payments checkout session for the submission fee and
 * redirects to it. The creator row itself is created by the webhook once
 * payment is confirmed — never on this call. See ARCHITECTURE.md § Payments.
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

  const { amountCents, ...creatorFields } = data;
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL;

  let checkoutUrl: string;
  try {
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [
        {
          product_id: dodoEnv().DODO_PAYMENTS_SUBMISSION_PRODUCT_ID,
          quantity: 1,
          // Overrides the product's price — the product must have "pay what
          // you want" pricing enabled in the Dodo dashboard, or this is
          // ignored. See ARCHITECTURE.md § Payments.
          amount: amountCents,
        },
      ],
      // Dodo appends ?payment_id=...&status=succeeded itself — no template
      // placeholder needed (unlike Stripe's {CHECKOUT_SESSION_ID}).
      return_url: `${appUrl}/submit/success`,
      cancel_url: `${appUrl}/submit`,
      metadata: {
        creator_data: JSON.stringify(creatorFields),
      },
    });

    if (!session.checkout_url) throw new Error("Dodo Payments did not return a checkout URL");
    checkoutUrl = session.checkout_url;
  } catch (err) {
    console.error("Failed to create Dodo Payments checkout session", err);
    return { error: "Couldn't start checkout. Try again in a moment." };
  }

  redirect(checkoutUrl);
}

/** Polled by /submit/success while the webhook is still landing. */
export async function checkSubmissionStatus(
  paymentId: string,
): Promise<{ username: string } | null> {
  return getCreatorByPaymentId(paymentId);
}
