import type { Metadata } from "next";

import { ContactLink, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Underhyped",
  description: "What Underhyped collects, why, and who touches it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="We collect very little. Here's all of it."
      title="Privacy Policy"
      updated="September 21, 2026"
      sections={[
        {
          heading: "What we collect from creators.",
          body: (
            <>
              <p>
                When you enter the arena we store what you type into the form: your
                name, username, bio, category, a link to your work, your social links,
                and an optional self-reported follower count.
              </p>
              <p>
                We don&apos;t ask for your avatar. We fetch your profile picture from
                Twitter, with a generated illustration as fallback.
              </p>
              <p>
                All of this is public by design — it is your profile, and it appears in
                battles, on the leaderboard, and in share images.
              </p>
            </>
          ),
        },
        {
          heading: "What we collect from voters.",
          body: (
            <>
              <p>
                Voting doesn&apos;t require an account. We set one cookie,{" "}
                <code className="rounded bg-card px-1.5 py-0.5 text-[13.5px]">
                  underhyped_voter
                </code>
                , holding a random id so we can give you fresh battles instead of the same
                pair twice and keep picks fair. It holds no personal information and is
                not used for advertising.
              </p>
              <p>
                We store each pick with that id and a timestamp. That&apos;s what
                calculates Aura.
              </p>
            </>
          ),
        },
        {
          heading: "Payments.",
          body: (
            <>
              <p>
                Payments are processed by Dodo Payments. They collect your billing details;
                we never see or store your card number. What we do keep is a receipt: the
                payment id, the amount, and the email you paid with, so we can find your
                payment if something goes wrong.
              </p>
              <p>
                Read Dodo Payments&apos; own privacy policy for how they handle your
                payment information.
              </p>
            </>
          ),
        },
        {
          heading: "Analytics.",
          body: (
            <>
              <p>
                We use Vercel Web Analytics for page-view analytics. It is cookieless and doesn&apos;t
                track you across other sites. It tells us things like which pages are
                visited and where visitors come from, in aggregate.
              </p>
            </>
          ),
        },
        {
          heading: "Who else touches your data.",
          body: (
            <>
              <p>
                We fetch your profile picture from Twitter. Vercel handles analytics.
                Dodo Payments handles money.
              </p>
              <p>We don&apos;t sell your data to anyone. Ever.</p>
            </>
          ),
        },
        {
          heading: "How we use it.",
          body: (
            <>
              <p>
                To run the game: show profiles, run battles, calculate Aura, build the
                leaderboard, render share cards, and reconcile payments. That&apos;s it.
              </p>
              <p>We don&apos;t send marketing emails. We don&apos;t have a newsletter.</p>
            </>
          ),
        },
        {
          heading: "Removing your profile.",
          body: (
            <>
              <p>
                Message <ContactLink /> from the social account linked on your profile
                and we&apos;ll take it down. Payment receipts are kept for bookkeeping.
              </p>
            </>
          ),
        },
        {
          heading: "Changes.",
          body: (
            <>
              <p>
                If this policy changes, the date at the top changes with it.
              </p>
            </>
          ),
        },
        {
          heading: "Contact.",
          body: (
            <>
              <p>
                Questions about privacy: <ContactLink />.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
