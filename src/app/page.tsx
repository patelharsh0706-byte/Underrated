import { ArenaStatsBar } from "@/components/arena-stats-bar";
import { BattleArena } from "@/components/battle/battle-arena";
import { EnterArenaCta } from "@/components/enter-arena-cta";
import { Scribble } from "@/components/scribble";
import { StatsPanel } from "@/components/battle/stats-panel";
import { Top10Panel, type Top10Entry } from "@/components/battle/top10-panel";
import { SponsorBanner } from "@/components/sponsor-banner";
import {
  getActiveSponsorship,
  getHomeStats,
  getLeaderboard,
  getRandomPair,
  getRecentJoins,
  getTop24h,
} from "@/lib/db/queries";
import { readVoterSession } from "@/lib/session";

// Every visitor needs a fresh random pair — this page must never be
// statically cached at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Drives the alternating placement slot — see RANKING.md § Pairing.
  const voterSession = await readVoterSession();

  const [pair, dailyHeat, sponsorship, homeStats, recentJoins] = await Promise.all([
    getRandomPair(voterSession),
    getTop24h(),
    getActiveSponsorship(),
    getHomeStats(),
    getRecentJoins(),
  ]);

  // Nobody's hit the 5-battles-today floor yet — fall back to all-time Aura
  // so the panel is never empty. See RANKING.md.
  const top10Mode = dailyHeat.length > 0 ? "daily" : "aura";

  let top10: Top10Entry[] = dailyHeat;
  if (dailyHeat.length === 0) {
    top10 = await getLeaderboard(10);
  } else if (dailyHeat.length < 10) {
    // Fewer than 10 creators qualified today — pad the rest with the
    // highest-Aura creators who didn't, so the panel doesn't look broken.
    const qualifiedIds = new Set(dailyHeat.map((entry) => entry.id));
    const padding = (await getLeaderboard(10 + dailyHeat.length))
      .filter((entry) => !qualifiedIds.has(entry.id))
      .slice(0, 10 - dailyHeat.length)
      .map((entry, i) => ({ ...entry, rank: dailyHeat.length + i + 1 }));
    top10 = [...dailyHeat, ...padding];
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-4 py-10 sm:gap-14 sm:py-16">
      {/* DESIGN.md rule 1: one headline line + one subhead line above the
          battle, maximum — never a marketing hero. */}
      <section className="relative flex w-full max-w-3xl flex-col items-center gap-3 pt-2 text-center sm:pt-4">
        <Scribble side="left" lines={["small creators.", "big impact."]} top={96} />
        <Scribble side="right" lines={["good people", "deserve", "more hype."]} top={52} />

        <h1 className="max-w-[12ch] text-balance font-display text-[clamp(32px,8vw,60px)] leading-[0.95] font-black tracking-[-0.04em]">
          Who&rsquo;s more{" "}
          <span className="relative z-0 inline-block px-1.5">
            <span
              aria-hidden="true"
              className="absolute inset-[12%_-10px_6%_-8px] -z-10 rotate-[-1.1deg] bg-lime [clip-path:polygon(1%_8%,99%_0%,100%_88%,98%_100%,2%_96%,0%_14%)]"
            />
            underhyped?
          </span>
        </h1>
        <p className="text-base text-ink-soft sm:text-lg">
          Two creators. One pick. Your pick moves their Aura.
        </p>
      </section>

      <BattleArena initialPair={pair} />

      <ArenaStatsBar
        battlesToday={homeStats.battlesToday}
        creatorsInArena={homeStats.creatorsInArena}
      />

      <EnterArenaCta />

      <SponsorBanner sponsorship={sponsorship} />

      <Top10Panel entries={top10} mode={top10Mode} />

      {/* TODO(Phase 5): Live on Underhyped panel */}

      <StatsPanel initialStats={homeStats} recentJoins={recentJoins} />
    </main>
  );
}
