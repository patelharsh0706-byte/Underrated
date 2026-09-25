import "server-only";

import { unstable_cache } from "next/cache";

import {
  getHomeLive,
  getHomeStats,
  getRandomPair,
  getRecentBattleResults,
  getRecentJoins,
  getTopWeek,
  type PublicCreator,
  type TopWeekEntry,
} from "@/lib/db/queries";
import {
  isMockMode,
  mockAnyPair,
  mockHomeLive,
  mockHomeStats,
  mockRecentBattleResults,
  mockRecentJoins,
  mockTopWeek,
} from "@/lib/db/mock-data";
import type { HomeLiveCounts } from "@/lib/home-live";

// Everything Home shows, in one cached read. `/` was the slow route
// (ISSUES.md: ~15 queries per render); Home is the same for every visitor,
// so it reads once a minute instead of once a request. The online count is
// the one live number — the client pings for it (src/app/actions/stats.ts).
//
// unstable_cache serialises to JSON, so dates travel as ISO strings.

export type FeedEvent =
  | { kind: "join"; at: string; name: string; username: string; avatarUrl: string | null }
  | { kind: "beat"; at: string; name: string; username: string; avatarUrl: string | null; loserName: string; loserUsername: string }
  | { kind: "aura"; at: string; name: string; username: string; avatarUrl: string | null; aura: number };

export interface HomeData {
  topWeek: TopWeekEntry[];
  live: HomeLiveCounts;
  onlineNow: number;
  feed: FeedEvent[];
  featured: [PublicCreator, PublicCreator] | null;
}

const FEED_LIMIT = 6;

async function load(): Promise<HomeData> {
  const mock = isMockMode();
  const [topWeek, live, stats, joins, battles, featured] = mock
    ? [mockTopWeek(10), mockHomeLive(), mockHomeStats(), mockRecentJoins(), mockRecentBattleResults(), mockAnyPair()]
    : await Promise.all([
        getTopWeek(10),
        getHomeLive(),
        getHomeStats(),
        getRecentJoins(FEED_LIMIT),
        getRecentBattleResults(FEED_LIMIT),
        // No session: the teaser is the same for everyone. Never throws the
        // page — with fewer than two creators there is simply no teaser.
        getRandomPair().catch(() => null),
      ]);

  // Only events that happened to a creator (DESIGN.md § Live panel): joins,
  // wins, and a win that crossed a round hundred told as "reached N Aura".
  const feed: FeedEvent[] = [
    ...joins.map((j): FeedEvent => ({
      kind: "join",
      at: j.createdAt.toISOString(),
      name: j.name,
      username: j.username,
      avatarUrl: j.avatarUrl,
    })),
    ...battles.map((b): FeedEvent =>
      b.auraMilestone !== null
        ? {
            kind: "aura",
            at: b.createdAt.toISOString(),
            name: b.winnerName,
            username: b.winnerUsername,
            avatarUrl: b.winnerAvatarUrl,
            aura: b.auraMilestone,
          }
        : {
            kind: "beat",
            at: b.createdAt.toISOString(),
            name: b.winnerName,
            username: b.winnerUsername,
            avatarUrl: b.winnerAvatarUrl,
            loserName: b.loserName,
            loserUsername: b.loserUsername,
          },
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, FEED_LIMIT);

  return { topWeek, live, onlineNow: stats.onlineNow, feed, featured };
}

const cachedLoad = unstable_cache(load, ["home-data-v1"], { revalidate: 60 });

export function getHomeData(): Promise<HomeData> {
  // Preview mode is local and changes with every edit — don't cache it.
  return isMockMode() ? load() : cachedLoad();
}
