import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { creatorFieldsSchema } from "@/lib/creator-schema";
import { insertCreator } from "@/lib/db/queries";
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
  metadata: Record<string, unknown>;
}) {
  const raw = payment.metadata?.creator_data;
  if (typeof raw !== "string") return; // not a submission payment

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    console.error("Dodo Payments metadata was not valid JSON", payment.payment_id);
    return;
  }

  const parsed = creatorFieldsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("Dodo Payments metadata failed validation", payment.payment_id, parsed.error);
    return;
  }

  const data = parsed.data;

  try {
    await insertCreator(data, {
      entryFeeCents: payment.total_amount,
      dodoPaymentId: payment.payment_id,
    });
  } catch (err) {
    // Most likely a username collision that slipped past the pre-payment
    // check (a race between two simultaneous submissions). The payment
    // already succeeded, so this needs a human to sort out — not a silent
    // drop.
    console.error(
      "Failed to insert creator from completed Dodo Payments payment",
      payment.payment_id,
      err,
    );
  }
}
