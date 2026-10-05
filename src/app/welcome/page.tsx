import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WelcomeFlow } from "@/components/profile/welcome-flow";
import { getSignedInUserId } from "@/lib/account";
import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { accounts, creators } from "@/lib/db/schema";
import { initialDraft } from "@/lib/profile/draft";
import { profileEditSchema } from "@/lib/profile/options";
import { getPreviewMe } from "@/lib/profile/preview-me";
import { getProfileV2 } from "@/lib/profile/queries";
import { finishedWelcomeHref, hasFinishedOnboarding } from "@/lib/profile/welcome-route";

// Onboarding v2, the five steps after Sign in with X — DECISIONS.md §
// 2026-10-05. Signed-in only. Never cached: it is one person's page.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Welcome — Underhyped" };

interface WelcomePageProps {
  searchParams: Promise<{ next?: string }>;
}

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/arena");

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext);

  // PREVIEW_MOCK=1: the prototype's sample person, so the flow can be reviewed.
  if (isMockMode()) {
    // The signed-in X person (session + X prefill cookie, no database); the
    // sample person when nobody is signed in.
    const mine = await getPreviewMe();
    // Already finished: no second run through the steps.
    if (mine?.profileDone) redirect(finishedWelcomeHref(next, mine.me.handle));
    const me = mine?.me ?? { name: "Maya Chen", handle: "maya_builds", avatar: null };
    return (
      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8 sm:py-10">
        <WelcomeFlow
          me={me}
          email={mine?.email ?? ""}
          draft={mine ? mine.draft : initialDraft({ xBio: "building stuff | ex-whatever | dm open | opinions mine", xLocation: "🇮🇳 Bengaluru", xUrl: "https://shipnotes.app" })}
          claimed={null}
          next={next}
          sample={!mine}
        />
      </main>
    );
  }

  const userId = await getSignedInUserId();
  if (!userId) redirect(next);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, userId));
  if (!account) redirect(next);

  let claimed = null;
  if (account.creatorId) {
    const [row] = await db.select({ username: creators.username }).from(creators).where(eq(creators.id, account.creatorId));
    // Already finished: no second run through the steps (Edit profile is on the profile).
    if (row && hasFinishedOnboarding(account)) redirect(finishedWelcomeHref(next, row.username));
    claimed = row ? await getProfileV2(row.username) : null;
  }
  const draft = account.draft
    ? profileEditSchema.parse(account.draft)
    : initialDraft({ xBio: account.xBio, xLocation: account.xLocation, xUrl: account.xUrl });
  const avatar = account.xAvatarUrl ? account.xAvatarUrl.replace("_normal.", "_400x400.") : null;

  return (
    <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8 sm:py-10">
      <WelcomeFlow
        me={{ name: account.xName || account.xUsername, handle: account.xUsername, avatar }}
        email={account.email ?? ""}
        draft={draft}
        claimed={claimed}
        next={next}
        sample={false}
      />
    </main>
  );
}
