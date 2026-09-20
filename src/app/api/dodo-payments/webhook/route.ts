import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { creatorFieldsSchema } from "@/lib/creator-schema";
import { insertCreator, linkPaymentToCreator, recordPayment } from "@/lib/db/queries";
import { getDodoClient } from "@/lib/dodo-payments";

export async function POST(request: Request) {
  const body = await request.text();
  const headerList = await headers();

  const webhookId = headerList.get("webhook-id");
  const webhookSignature = headerList.get("webhook-signature");
  const webhookTimestamp = headerList.get("webhook-timestamp");

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  let event;
  try {
    event = getDodoClient().webhooks.unwrap(body, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": webhookSignature,
        "webhook-timestamp": webhookTimestamp,
      },
    });
  } catch (err) {
    console.error("Dodo Payments webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment.succeeded") {
    await handleCompletedSubmission(event.data);
  }

  return NextResponse.json({ received: true });
}

async function handleCompletedSubmission(payment: {
  payment_id: string;
  total_amount: number;
  currency: string;
  customer: { email: string; name: string };
  metadata: Record<string, unknown>;
}) {
  // Only ever reached for payment.succeeded — that check in POST is the single
  // gate between Dodo and the database. Nothing below runs for failed,
  // cancelled, or pending payments. See DATABASE.md § Invariants.
  //
  // Parse the submitted form out of metadata if it's there — but never let
  // its absence stop the ledger write below. The static Payment Link carries
  // no metadata at all, and two real payments vanished because the old code
  // returned early right here. See DATABASE.md § payments.
  const data = parseCreatorData(payment.payment_id, payment.metadata?.creator_data);

  // 1. The creator, first: insertCreator resolves the avatar and writes the
  //    row, and getRandomPair serves any active creator, so they are in the
  //    battle pool from the next pairing. Wrapped so a failure here (most
  //    likely a username collision that slipped past the pre-payment check)
  //    can never stop the ledger write that follows.
  if (data) {
    try {
      await insertCreator(data, {
        entryFeeCents: payment.total_amount,
        dodoPaymentId: payment.payment_id,
      });
    } catch (err) {
      console.error(
        "Failed to insert creator from completed Dodo Payments payment",
        payment.payment_id,
        err,
      );
    }
  }

  // 2. The ledger, unconditionally. Money received is never silent, whether
  //    or not a creator could be made from it.
  await recordPayment({
    dodoPaymentId: payment.payment_id,
    amountCents: payment.total_amount,
    currency: payment.currency,
    customerEmail: payment.customer?.email ?? null,
    customerName: payment.customer?.name ?? null,
    xProfileUrl: data?.socials.twitter ?? null,
    workUrl: data?.workUrl ?? null,
    metadata: payment.metadata ?? null,
  });

  // 3. Tie them together. A no-op when no creator exists for this payment —
  //    that row then shows up in the orphan list (creator_id IS NULL).
  await linkPaymentToCreator(payment.payment_id);
}

/** The validated form payload from payment metadata, or null if absent/invalid. */
function parseCreatorData(paymentId: string, raw: unknown) {
  if (typeof raw !== "string") return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    console.error("Dodo Payments metadata was not valid JSON", paymentId);
    return null;
  }

  const parsed = creatorFieldsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("Dodo Payments metadata failed validation", paymentId, parsed.error);
    return null;
  }
  return parsed.data;
}
