import { BattleArena } from "@/components/battle/battle-arena";
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

// Every visitor needs a fresh random pair — this page must never be
// statically cached at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pair, dailyHeat, sponsorship, homeStats, recentJoins] = await Promise.all([
    getRandomPair(),
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
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-12 sm:gap-12 sm:py-20">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Who&apos;s more underhyped?
        </h1>
        <p className="max-w-md text-muted-foreground">
          Discover people before everyone else does.
        </p>
      </div>

      <BattleArena initialPair={pair} />

      <SponsorBanner sponsorship={sponsorship} />

      <Top10Panel entries={top10} mode={top10Mode} />

      <StatsPanel initialStats={homeStats} recentJoins={recentJoins} />
    </main>
  );
}
