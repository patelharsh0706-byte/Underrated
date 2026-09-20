import type { Metadata } from "next";
import Link from "next/link";

import { ContactLink, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy — Underhyped",
  description: "One-time payments, no subscriptions, no refunds. With one exception.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Short, because there's one rule."
      title="Refund & Cancellation Policy"
      updated="September 21, 2026"
      sections={[
        {
          heading: "We don't refund anything.",
          body: (
            <>
              <p>
                Every payment on Underhyped is a one-time fee for a digital placement:
                a creator profile in the arena, or a sponsor spot on the homepage. Once
                you pay, the sale is final.
              </p>
              <p>
                We don&apos;t refund because your Aura went down, you lost battles, you
                dropped off the leaderboard, you didn&apos;t become Main Character, you
                got fewer clicks than you hoped, or you changed your mind.
              </p>
            </>
          ),
        },
        {
          heading: "No subscriptions.",
          body: (
            <>
              <p>
                Nothing on Underhyped renews. There is nothing to cancel. A sponsor spot
                runs for its fixed period and then simply ends.
              </p>
            </>
          ),
        },
        {
          heading: "Rank moves. That's the product.",
          body: (
            <>
              <p>
                Aura is decided by picks from other people, and it changes every time
                someone votes. Losing rank is not a billing error. The entry fee bought
                you a seat in the arena, not a position in it.
              </p>
            </>
          ),
        },
        {
          heading: "Removed for breaking the rules.",
          body: (
            <>
              <p>
                Profiles or sponsor placements removed for manipulation, impersonation,
                or content violations are not refunded. See the{" "}
                <Link href="/rules" className="font-bold text-foreground hover:underline">
                  Rules
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="font-bold text-foreground hover:underline">
                  Terms
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          heading: "Charged and never listed.",
          body: (
            <>
              <p>
                The one exception. If your payment went through and your profile or
                sponsor spot never appeared — a system failure on our side, not a lost
                battle — message <ContactLink /> within 7 days with your payment email or
                receipt. We keep a record of every successful payment, so we can find it
                and either fix the listing or refund you.
              </p>
            </>
          ),
        },
        {
          heading: "Contact.",
          body: (
            <>
              <p>
                Billing questions: <ContactLink />.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
