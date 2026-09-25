import type { Metadata } from "next";
import Link from "next/link";

import { ContactLink, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Underhyped",
  description: "The rules of using Underhyped. Short, because there isn't much to it.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The boring-but-necessary part."
      title="Terms of Service"
      updated="September 21, 2026"
      sections={[
        {
          heading: "Acceptance of terms.",
          body: (
            <>
              <p>
                By using Underhyped you agree to these terms. If you don&apos;t agree,
                don&apos;t use the site. That&apos;s the whole deal.
              </p>
            </>
          ),
        },
        {
          heading: "What Underhyped is.",
          body: (
            <>
              <p>
                Underhyped is a social discovery game. Visitors see two creators, pick who
                they think is more underhyped, and that pick changes each creator&apos;s
                Aura. Creators can pay a one-time entry fee to enter the arena and get a
                public profile that can appear in battles and on the leaderboard.
              </p>
              <p>
                Aura and rank are decided entirely by picks from other people. Nothing
                else moves them.
              </p>
            </>
          ),
        },
        {
          heading: "Payments buy entry. Nothing else.",
          body: (
            <>
              <p>
                The creator entry fee is a one-time payment for a profile in the arena.
                There are no subscriptions and nothing renews.
              </p>
              <p>
                Paying does not give you Aura, rank, easier opponents, better
                matchmaking, Main Character status, or any other advantage. Paid entries
                are ranked exactly the same way as everyone else.
              </p>
              <p>
                Aura can go down as well as up. We don&apos;t guarantee any rank, any
                number of battles, or that anyone will ever pick you.
              </p>
            </>
          ),
        },
        {
          heading: "Spotlight is an ad, and is labeled as one.",
          body: (
            <>
              <p>
                Sponsors can buy the Underhyped Spot in the Arena for a fixed period.
                It is clearly marked as sponsored. It is a placement, not a ranking, and
                it has no effect on any creator&apos;s Aura, battles, or leaderboard
                position.
              </p>
              <p>
                We can decline or remove a sponsor placement that breaks the content
                rules below.
              </p>
            </>
          ),
        },
        {
          heading: "Your profile is your responsibility.",
          body: (
            <>
              <p>
                Only submit yourself, or someone who has agreed to be listed. Link your
                real work and your real social accounts. Don&apos;t impersonate anyone.
              </p>
              <p>
                By submitting, you give us permission to show your name, username,
                avatar, bio, category, and links publicly on the site, in battles, on the
                leaderboard, and in share images.
              </p>
              <p>
                If you want your profile removed, message <ContactLink />. Removal doesn&apos;t
                come with a refund — see the Refund Policy.
              </p>
            </>
          ),
        },
        {
          heading: "Content rules.",
          body: (
            <>
              <p>
                Don&apos;t submit or link to anything illegal, explicit, hateful,
                harassing, deceptive, or malicious. Don&apos;t submit profiles for people
                who are underage.
              </p>
              <p>
                We can remove any profile or sponsor placement that breaks these rules,
                without notice and without refund.
              </p>
            </>
          ),
        },
        {
          heading: "Don't rig the game.",
          body: (
            <>
              <p>
                No bots, no automated picks, no fake accounts, no vote rings, no
                harassing people ranked above you. The full list lives on the{" "}
                <Link href="/rules" className="font-bold text-foreground hover:underline">
                  Rules
                </Link>{" "}
                page.
              </p>
              <p>
                Obvious manipulation can result in picks being removed or profiles being
                kicked out of the arena. No refund.
              </p>
            </>
          ),
        },
        {
          heading: "It's a game, not a verdict.",
          body: (
            <>
              <p>
                Aura is a score inside a weird internet game. It is not a measure of
                anyone&apos;s worth, talent, or employability. Treat it accordingly.
              </p>
            </>
          ),
        },
        {
          heading: "No warranties.",
          body: (
            <>
              <p>
                Underhyped is provided &ldquo;as is&rdquo; with no warranties of any
                kind. We don&apos;t guarantee uptime, that the site will be free of bugs,
                or that a placement will bring you any particular amount of attention,
                followers, traffic, or clicks.
              </p>
              <p>
                To the extent the law allows, we are not liable for any loss arising
                from your use of the site.
              </p>
            </>
          ),
        },
        {
          heading: "Changes.",
          body: (
            <>
              <p>
                We may update these terms. The date at the top tells you when. Continuing
                to use the site after a change means you accept it.
              </p>
            </>
          ),
        },
        {
          heading: "Contact.",
          body: (
            <>
              <p>Questions about these terms: <ContactLink />.</p>
            </>
          ),
        },
      ]}
    />
  );
}
