"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { pingVisitor } from "@/app/actions/stats";
import type { HomeStats, RecentJoin } from "@/lib/db/queries";

const PING_INTERVAL_MS = 45_000;

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
}

function tilesFor(stats: HomeStats): StatTile[] {
  return [
    { label: "visitors so far", value: stats.visitorsSoFar.toLocaleString() },
    { label: "battles fought", value: stats.battlesSoFar.toLocaleString() },
    { label: "paid to join", value: formatMoney(stats.paidForBattlesCents) },
    { label: "site visits", value: stats.siteVisits.toLocaleString() },
  ];
}

interface StatsPanelProps {
  initialStats: HomeStats;
  recentJoins: RecentJoin[];
}

export function StatsPanel({ initialStats, recentJoins }: StatsPanelProps) {
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

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">Live</h2>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-winner" />
          <strong className="font-mono text-foreground">{stats.onlineNow}</strong> hanging out
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tilesFor(stats).map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-1 rounded-xl border-2 border-foreground bg-card px-3 py-2.5"
          >
            <span className="font-mono text-xl font-bold tabular-nums sm:text-2xl">
              {tile.value}
            </span>
            <span className="text-xs text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>

      {recentJoins.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card px-3 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Just happened
          </span>
          <ul className="flex flex-col gap-1.5">
            {recentJoins.map((join) => (
              <li
                key={join.username}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <Link href={`/c/${join.username}`} className="font-bold hover:underline">
                    {join.name}
                  </Link>{" "}
                  <span className="text-muted-foreground">joined the leaderboard</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
                  {join.entryFeeCents !== null ? (
                    <span className="text-winner">{formatMoney(join.entryFeeCents)}</span>
                  ) : null}
                  {formatTimeAgo(join.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
