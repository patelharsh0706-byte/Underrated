"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { pingVisitor } from "@/app/actions/stats";
import type { HomeStats, RecentBattleResult, RecentJoin } from "@/lib/db/queries";

const PING_INTERVAL_MS = 45_000;
const FEED_LIMIT = 6;

function formatTimeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

interface StatTile {
  label: string;
  value: string;
  icon: string;
}

// Social proof, not analytics — see DECISIONS.md § 2026-09-10 "Live on
// Underhyped replaces the stats bar". Deliberately not "votes cast": one
// battles row is one pick, so a votes counter would render the same figure
// as battles fought — peopleDeciding (distinct voter sessions) is a
// genuinely different, honest number instead.
//
// The design mockup's fourth tile counts nominations. Nominations are NOT V1
// (MVP.md; DECISIONS.md § 2026-09-10 "Nominations are not V1"), so there is
// no such number to show — today's picks takes the slot instead.
function tilesFor(stats: HomeStats): StatTile[] {
  return [
    { icon: "⚔️", label: "battles fought", value: stats.battlesSoFar.toLocaleString() },
    { icon: "🔥", label: "creators in the Arena", value: stats.creatorsInArena.toLocaleString() },
    { icon: "🗳️", label: "people deciding", value: stats.peopleDeciding.toLocaleString() },
    { icon: "↑", label: "picks today", value: stats.battlesToday.toLocaleString() },
  ];
}

type FeedItem =
  | { kind: "join"; createdAt: Date; join: RecentJoin }
  | { kind: "battle"; createdAt: Date; battle: RecentBattleResult };

function mergeFeed(recentJoins: RecentJoin[], recentBattles: RecentBattleResult[]): FeedItem[] {
  const items: FeedItem[] = [
    ...recentJoins.map((join): FeedItem => ({ kind: "join", createdAt: join.createdAt, join })),
    ...recentBattles.map(
      (battle): FeedItem => ({ kind: "battle", createdAt: battle.createdAt, battle }),
    ),
  ];
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, FEED_LIMIT);
}

/** Bold, linked when we know where the profile is. */
function CreatorName({ name, username }: { name: string; username: string }) {
  if (!username) return <span className="font-bold">{name}</span>;
  return (
    <Link href={`/c/${username}`} className="font-bold hover:underline">
      {name}
    </Link>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  if (item.kind === "join") {
    return (
      <>
        <span className="w-6 shrink-0 text-center text-[17px]" aria-hidden="true">
          🔥
        </span>
        <span className="min-w-0 flex-1 truncate">
          <CreatorName name={item.join.name} username={item.join.username} />{" "}
          <span className="text-ink-soft">entered the Arena</span>
        </span>
      </>
    );
  }

  const { battle } = item;

  // A battle that pushed the winner past a round hundred is the more notable
  // way to tell the same event — same row, different framing.
  if (battle.auraMilestone !== null) {
    return (
      <>
        <span className="w-6 shrink-0 text-center text-[17px]" aria-hidden="true">
          ⚡
        </span>
        <span className="min-w-0 flex-1 truncate">
          <CreatorName name={battle.winnerName} username={battle.winnerUsername} />{" "}
          <span className="text-ink-soft">
            reached {battle.auraMilestone.toLocaleString()} Aura
          </span>
        </span>
      </>
    );
  }

  return (
    <>
      <span className="w-6 shrink-0 text-center text-[17px]" aria-hidden="true">
        ⚔️
      </span>
      <span className="min-w-0 flex-1 truncate">
        <CreatorName name={battle.winnerName} username={battle.winnerUsername} />{" "}
        <span className="text-ink-soft">beat</span>{" "}
        <CreatorName name={battle.loserName} username={battle.loserUsername} />
      </span>
    </>
  );
}

interface StatsPanelProps {
  initialStats: HomeStats;
  recentJoins: RecentJoin[];
  recentBattles: RecentBattleResult[];
}

export function StatsPanel({ initialStats, recentJoins, recentBattles }: StatsPanelProps) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      if (document.hidden) return;
      try {
        const next = await pingVisitor();
        if (!cancelled) setStats(next);
      } catch {
        // A missed heartbeat just means slightly stale numbers until the next tick.
      }
    };

    void ping();
    const interval = window.setInterval(() => void ping(), PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  const feed = mergeFeed(recentJoins, recentBattles);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6 rounded-card border border-hairline bg-card px-5 py-6 shadow-card sm:px-8 sm:py-7">
      <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
        <h2 className="font-display text-[13px] font-bold tracking-[0.16em] uppercase">
          Live on Underhyped
        </h2>
        <span className="flex items-center gap-2 text-[14px] text-ink-soft">
          <span className="h-2 w-2 rounded-full bg-winner" />
          <strong className="font-display font-bold text-foreground">{stats.onlineNow}</strong>{" "}
          online
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {tilesFor(stats).map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-background px-3 py-5 text-center"
          >
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] leading-none font-black tracking-tight tabular-nums sm:text-[32px]">
                {tile.value}
              </span>
              <span className="text-base leading-none" aria-hidden="true">
                {tile.icon}
              </span>
            </span>
            <span className="text-[13px] text-ink-soft">{tile.label}</span>
          </div>
        ))}
      </div>

      {feed.length > 0 ? (
        <div className="flex flex-col">
          <p className="border-b border-hairline pb-3 text-[11px] font-bold tracking-[0.16em] text-ink-soft uppercase">
            Just happened
          </p>
          <ul className="flex flex-col">
            {feed.map((item, i) => (
              <li
                key={`${item.kind}-${item.createdAt.getTime()}-${i}`}
                className="flex items-center gap-3 border-b border-hairline py-3.5 text-[15px] last:border-b-0 sm:text-base"
              >
                <FeedRow item={item} />
                <span className="shrink-0 text-[13px] text-ink-faint tabular-nums">
                  {formatTimeAgo(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
