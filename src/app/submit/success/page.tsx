import { redirect } from "next/navigation";

import { SubmissionPoller } from "@/components/submit/submission-poller";
import { getCreatorByPaymentId } from "@/lib/db/queries";

interface SubmitSuccessPageProps {
  // Dodo Payments appends these to return_url itself — no template
  // placeholder needed at checkout-creation time.
  searchParams: Promise<{ payment_id?: string; status?: string }>;
}

export default async function SubmitSuccessPage({ searchParams }: SubmitSuccessPageProps) {
  const { payment_id: paymentId } = await searchParams;
  if (!paymentId) redirect("/submit");

  // The webhook usually beats the redirect back from Dodo, but not always —
  // check once here, then let the client poll if it hasn't landed yet.
  const creator = await getCreatorByPaymentId(paymentId);
  if (creator) redirect(`/c/${creator.username}`);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Payment received 🎉</h1>
      <p className="text-sm text-muted-foreground">
        Setting up your profile — this takes a few seconds.
      </p>
      <SubmissionPoller paymentId={paymentId} />
    </main>
  );
}
