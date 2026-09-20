import type { Metadata } from "next";

import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";
import { MarkerSwipe } from "@/components/marker-swipe";
import type { BoardEntry } from "@/components/leaderboard/types";
import { Scribble } from "@/components/scribble";
import { getLeaderboard, getTop24h } from "@/lib/db/queries";
import { isMockMode, mockLeaderboard, mockTop24h } from "@/lib/db/mock-data";

// Aura changes with every pick; a short revalidate window keeps this page
// mostly cached without ever going stale for long. See ARCHITECTURE.md.
export const revalidate = 15;

export const metadata: Metadata = {
  title: "Leaderboard — Underhyped",
  description: "Creators ranked by Aura🔥.",
};

export default async function LeaderboardPage() {
  // getTop24h() is the exact query the homepage uses to find the Main
  // Character (see src/app/page.tsx / top10-panel.tsx) — reusing it here,
  // rather than re-deriving "today's #1" some other way, is what keeps this
  // page from ever disagreeing with the homepage about who holds the crown.
  // Rank 1 of an unfiltered getTop24h() result *is* the Main Character by
  // definition (RANKING.md § Main Character); the id is threaded down so
  // that fact only gets applied to whoever it's actually true of, even once
  // scope/category filtering moves people to different positions client-side.
  // PREVIEW_MOCK=1 — see src/lib/db/mock-data.ts. Temporary, for viewing
  // the frontend without a live database.
  const [leaderboard, dailyHeat] = isMockMode()
    ? [mockLeaderboard(100), mockTop24h()]
    : await Promise.all([getLeaderboard(100), getTop24h(100)]);

  const mainCharacterId = dailyHeat[0]?.id ?? null;

  const allTime: BoardEntry[] = leaderboard.map((entry) => ({
    id: entry.id,
    username: entry.username,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    bio: entry.bio,
    category: entry.category,
    metric: entry.aura,
  }));

  const daily: BoardEntry[] = dailyHeat.map((entry) => ({
    id: entry.id,
    username: entry.username,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    bio: entry.bio,
    category: entry.category,
    metric: entry.dailyHeat,
  }));

  return (
    <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
      <section className="relative py-8 text-center sm:py-10">
        <Scribble side="left" lines={["good people", "deserve", "more hype."]} top={96} />
        <Scribble side="right" lines={["small creators.", "big impact."]} top={52} />

        <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
          The internet&apos;s leaderboard for
        </p>
        <h1 className="mx-auto max-w-[14ch] font-display text-[clamp(32px,5.4vw,60px)] leading-[0.98] font-black tracking-[-0.04em]">
          Underhyped <MarkerSwipe>creators.</MarkerSwipe>
        </h1>
        <p className="mt-3 text-[15px] text-ink-soft sm:text-base">
          Ranked by Aura. Moved only by picks — never by money.
        </p>
      </section>

      <LeaderboardBoard allTime={allTime} daily={daily} mainCharacterId={mainCharacterId} />
    </main>
  );
}
