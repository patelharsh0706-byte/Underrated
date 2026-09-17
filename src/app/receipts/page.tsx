import { redirect } from "next/navigation";

import { SignInButton } from "@/components/receipts/sign-in-button";
import { MarkerSwipe } from "@/components/marker-swipe";
import { getUserId } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/db/queries";

// The nav's "Receipts" link points here because it has to work before anyone
// knows their handle. Signed in, it forwards to the real page at
// /[username]/receipts; signed out, it is the pitch for why to sign in.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Receipts — Underhyped",
  robots: { index: false },
};

export default async function ReceiptsPage() {
  const userId = await getUserId();

  if (userId) {
    const profile = await getProfileByUserId(userId);
    if (profile) redirect(`/${profile.username}/receipts`);
  }

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pt-16 pb-24 text-center">
      <p className="font-display text-[11px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        🧾 Receipts
      </p>

      <h1 className="mt-3 font-display text-3xl font-black tracking-[-0.035em] sm:text-[44px]">
        Proof you were <MarkerSwipe>early</MarkerSwipe>.
      </h1>

      <p className="mx-auto mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
        Anyone can say they liked someone before they blew up. Receipts are the
        part that can&apos;t be faked — we remember who you backed, and what rank
        they were when you did.
      </p>

      <div className="mx-auto mt-8 max-w-[320px]">
        <SignInButton />
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Playing never needs an account. This is only for keeping the proof.
      </p>
    </main>
  );
}
