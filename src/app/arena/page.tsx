import { ArenaStatsBar } from "@/components/arena-stats-bar";
import { BattleArena } from "@/components/battle/battle-arena";
import { PicksTodayProvider } from "@/components/battle/picks-today";
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
  getRecentBattleResults,
  getRecentJoins,
  getTop24h,
} from "@/lib/db/queries";
import {
  isMockMode,
  mockActiveSponsorship,
  mockHomeStats,
  mockLeaderboard,
  mockRandomPair,
  mockRecentBattleResults,
  mockRecentJoins,
  mockTop24h,
} from "@/lib/db/mock-data";
import { readVoterSession } from "@/lib/session";

// Every visitor needs a fresh random pair — this page must never be
// statically cached at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Arena · Underhyped",
  description: "Two creators. One hype. Your hype moves their Aura.",
};

// The Arena — the battle. Moved from `/` to `/arena` in V3 (DECISIONS.md
// § 2026-09-24); `/` is now Home. UX rule 1 applies here.
export default async function ArenaPage() {
  // Drives the alternating placement slot — see RANKING.md § Pairing.
  const voterSession = await readVoterSession();

  // PREVIEW_MOCK=1 — see src/lib/db/mock-data.ts. Temporary, for viewing
  // the frontend without a live database.
  const [pair, dailyHeat, sponsorship, homeStats, recentJoins, recentBattles] = isMockMode()
    ? [
        mockRandomPair(),
        mockTop24h(),
        mockActiveSponsorship(),
        mockHomeStats(),
        mockRecentJoins(),
        mockRecentBattleResults(),
      ]
    : await Promise.all([
        getRandomPair(voterSession),
        getTop24h(),
        getActiveSponsorship(),
        getHomeStats(),
        getRecentJoins(),
        getRecentBattleResults(),
      ]);

  // Nobody's hit the 5-battles-today floor yet — fall back to all-time Aura
  // so the panel is never empty. See RANKING.md.
  const top10Mode = dailyHeat.length > 0 ? "daily" : "aura";

  let top10: Top10Entry[] = dailyHeat;
  if (dailyHeat.length === 0) {
    top10 = isMockMode() ? mockLeaderboard(10) : await getLeaderboard(10);
  } else if (dailyHeat.length < 10) {
    // Fewer than 10 creators qualified today — pad the rest with the
    // highest-Aura creators who didn't, so the panel doesn't look broken.
    const qualifiedIds = new Set(dailyHeat.map((entry) => entry.id));
    const fullLeaderboard = isMockMode()
      ? mockLeaderboard(10 + dailyHeat.length)
      : await getLeaderboard(10 + dailyHeat.length);
    const padding = fullLeaderboard
      .filter((entry) => !qualifiedIds.has(entry.id))
      .slice(0, 10 - dailyHeat.length)
      .map((entry, i) => ({ ...entry, rank: dailyHeat.length + i + 1 }));
    top10 = [...dailyHeat, ...padding];
  }

  // Faces for the pulse row. Today's battled creators when there are any,
  // otherwise the top of the board — `top10` is already resolved above, so
  // either way this costs no extra query and the row is never face-less.
  // The fallback is deliberate: see DECISIONS.md § 2026-09-12 "The pulse-row
  // facepile is always populated". They are still always real creators with
  // working profile links, and still never voters.
  const pulseFaces = (dailyHeat.length > 0 ? dailyHeat : top10)
    .slice(0, 4)
    .map((entry) => ({
      username: entry.username,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
    }));

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-4 py-10 sm:gap-14 sm:py-16">
      {/* DESIGN.md rule 1: one eyebrow line, one headline line, one subhead
          line above the battle, maximum — never a marketing hero. */}
      <section className="relative flex w-full max-w-3xl flex-col items-center gap-3 pt-2 text-center sm:pt-4">
        <Scribble side="left" lines={["small creators.", "big impact."]} top={96} />
        <Scribble side="right" lines={["good people", "deserve", "more hype."]} top={52} />

        <p className="font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          The internet&rsquo;s hidden talent
        </p>

        <h1 className="max-w-[12ch] text-balance font-display text-[clamp(32px,8vw,60px)] leading-[0.95] font-black tracking-[-0.04em]">
          Who&rsquo;s more{" "}
          <span className="relative z-0 inline-block px-1.5 text-[#111]">
            <span
              aria-hidden="true"
              className="absolute inset-[12%_-10px_6%_-8px] -z-10 rotate-[-1.1deg] bg-lime [clip-path:polygon(1%_8%,99%_0%,100%_88%,98%_100%,2%_96%,0%_14%)]"
            />
            underhyped?
          </span>
        </h1>
        <p className="text-base text-ink-soft sm:text-lg">
          Two creators. One hype. Your hype moves their Aura.
        </p>
      </section>

      {/* Both counters below read one live value, so a pick moves the number
          it just changed instead of leaving it frozen until a reload. */}
      <PicksTodayProvider initial={homeStats.battlesToday}>
        <BattleArena
          initialPair={pair}
          battlesToday={homeStats.battlesToday}
          faces={pulseFaces}
        />

        {/* CTA before the stats bar: the pulse row hands straight off to the
            one action the page wants, and the stats bar then closes the block
            rather than interrupting it. */}
        <EnterArenaCta />

        <ArenaStatsBar
          battlesToday={homeStats.battlesToday}
          creatorsInArena={homeStats.creatorsInArena}
        />
      </PicksTodayProvider>

      {/* Static explainer — no data, so it lives inline here rather than as
          its own component; it has exactly one consumer. */}
      <section className="grid w-full max-w-[1012px] grid-cols-1 gap-8 divide-y divide-hairline sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center first:pt-0 sm:pt-0">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-foreground/[0.055]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="16.5" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M3.5 18c.8-3 3-4.4 5.5-4.4S13.7 15 14.5 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M17 13.8c2 .3 3.4 1.6 4 4.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight">Discover</h3>
          <p className="text-sm text-ink-soft">Find underrated creators from across the internet.</p>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center sm:pt-0">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-foreground/[0.055]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M13.5 2.5L4.5 13.8h6L10 21.5l9.5-11.6h-6.3l.3-7.4z"
                fill="currentColor"
              />
            </svg>
          </span>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight">Hype</h3>
          <p className="text-sm text-ink-soft">Back the person you think deserves more attention.</p>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center sm:pt-0">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-foreground/[0.055]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="13" width="4" height="7.5" rx="1" fill="currentColor" />
              <rect x="10" y="8.5" width="4" height="12" rx="1" fill="currentColor" />
              <rect x="16.5" y="4" width="4" height="16.5" rx="1" fill="currentColor" />
            </svg>
          </span>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight">Boost</h3>
          <p className="text-sm text-ink-soft">
            Their Aura climbs and the leaderboard does the shouting.
          </p>
        </div>
      </section>

      <SponsorBanner sponsorship={sponsorship} />

      <Top10Panel entries={top10} mode={top10Mode} />

      <StatsPanel
        initialStats={homeStats}
        recentJoins={recentJoins}
        recentBattles={recentBattles}
      />
    </main>
  );
}
