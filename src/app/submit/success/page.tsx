import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SubmissionPoller } from "@/components/submit/submission-poller";
import { WelcomeCard } from "@/components/submit/welcome-card";
import { getAppOrigin } from "@/lib/app-url";
import { getCreatorByPaymentId, getCreatorByUsername, getLeaderboard } from "@/lib/db/queries";
import { isMockMode, mockLeaderboard, mockNewCreator } from "@/lib/db/mock-data";

export const metadata: Metadata = {
  title: "You’re in the Arena — Underhyped",
};

interface SubmitSuccessPageProps {
  // Dodo Payments appends these to return_url itself — no template
  // placeholder needed at checkout-creation time.
  searchParams: Promise<{ payment_id?: string; status?: string }>;
}

export default async function SubmitSuccessPage({ searchParams }: SubmitSuccessPageProps) {
  const { payment_id: paymentId } = await searchParams;
  if (!paymentId) redirect("/submit");

  // PREVIEW_MOCK=1 — see src/lib/db/mock-data.ts. Temporary, for viewing the
  // frontend without a live database or a real payment.
  if (isMockMode()) {
    const creator = mockNewCreator();
    return (
      <main className="flex w-full flex-1 flex-col px-4 pb-16">
        <WelcomeCard
          creator={creator}
          profileUrl={`https://underhyped.wtf/c/${creator.username}`}
          arenaFaces={mockLeaderboard(3)}
        />
      </main>
    );
  }

  // The webhook usually beats the redirect back from Dodo, but not always —
  // check once here, then let the client poll if it hasn't landed yet.
  const paid = await getCreatorByPaymentId(paymentId);

  if (!paid) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Payment received 🎉</h1>
        <p className="text-sm text-ink-soft">Setting up your profile — this takes a few seconds.</p>
        <SubmissionPoller paymentId={paymentId} />
      </main>
    );
  }

  const creator = await getCreatorByUsername(paid.username);
  if (!creator) redirect(`/c/${paid.username}`);

  const origin = await getAppOrigin();

  // Creators already in the Arena — the people this one will be matched
  // against. Four fetched so self can be dropped and three still remain.
  const arenaFaces = (await getLeaderboard(4)).filter((c) => c.id !== creator.id).slice(0, 3);

  return (
    <main className="flex w-full flex-1 flex-col px-4 pb-16">
      <WelcomeCard
        creator={creator}
        profileUrl={`${origin}/c/${creator.username}`}
        arenaFaces={arenaFaces}
      />
    </main>
  );
}
