"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CATEGORIES } from "@/components/submit/enter-arena-flow";
import { DAILY_HEAT_BATTLES_REQUIRED, DAILY_HEAT_VOTERS_REQUIRED } from "@/lib/ranking/daily-heat";
import { PLACEMENT_BATTLES_REQUIRED, PLACEMENT_VOTERS_REQUIRED } from "@/lib/ranking/placement";
import { cn } from "@/lib/utils";

import { Podium } from "./podium";
import { RankRow } from "./rank-row";
import type { BoardEntry, RankedEntry } from "./types";

const PAGE_SIZE = 8;

const SCOPES = [
  { value: "all", label: "All-time Aura" },
  { value: "today", label: "Today's heat" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

interface LeaderboardBoardProps {
  /** getLeaderboard() rows, normalized — ranked by Aura. */
  allTime: BoardEntry[];
  /** getTop24h() rows, normalized — ranked by Daily Heat. */
  daily: BoardEntry[];
  /** The real Main Character's id (getTop24h()[0]), or null if nobody has
   *  qualified today. Threaded through to rank-title so #1 is only ever
   *  labeled Main Character when it's actually true. */
  mainCharacterId: string | null;
}

/**
 * Client island for the leaderboard's interactive surface — scope tabs,
 * category chips, podium and table. The page itself stays a Server
 * Component and does the one real data fetch; both scopes' full data is
 * already in hand here, so switching tabs/chips never refetches.
 */
export function LeaderboardBoard({ allTime, daily, mainCharacterId }: LeaderboardBoardProps) {
  const [scope, setScope] = useState<Scope>("all");
  const [category, setCategory] = useState<string>("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  const isDaily = scope === "today";
  const source = isDaily ? daily : allTime;

  // Both sources arrive pre-sorted by their metric (server-side), so
  // filtering by category preserves order — re-rank is just a reindex.
  const filtered = useMemo<RankedEntry[]>(() => {
    const base = category === "all" ? source : source.filter((entry) => entry.category === category);
    return base.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [source, category]);

  function changeScope(next: Scope) {
    setScope(next);
    setShown(PAGE_SIZE);
  }

  function changeCategory(next: string) {
    setCategory(next);
    setShown(PAGE_SIZE);
  }

  if (source.length === 0) {
    return (
      <>
        <Filters scope={scope} category={category} onScope={changeScope} onCategory={changeCategory} />
        <EmptyBoard isDaily={isDaily} />
      </>
    );
  }

  const hasPodium = filtered.length >= 3;
  const top3 = hasPodium ? (filtered.slice(0, 3) as [RankedEntry, RankedEntry, RankedEntry]) : null;
  const rest = hasPodium ? filtered.slice(3) : filtered;
  const visible = rest.slice(0, shown);
  const showingCount = (hasPodium ? 3 : 0) + visible.length;

  return (
    <>
      <Filters scope={scope} category={category} onScope={changeScope} onCategory={changeCategory} />

      {top3 ? <Podium top3={top3} isDaily={isDaily} mainCharacterId={mainCharacterId} /> : null}

      <div className="mt-2">
        <div className="hidden grid-cols-[30px_1fr_148px_104px] gap-4 border-b border-hairline-2 px-1 pb-2.5 font-display text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase sm:grid">
          <span>#</span>
          <span>Creator</span>
          <span>Category</span>
          <span>{isDaily ? "Heat 24h" : "Aura"}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-ink-soft">
            No creators in this category yet.
          </p>
        ) : (
          <div>
            {visible.map((entry) => (
              <RankRow key={entry.id} entry={entry} isDaily={isDaily} mainCharacterId={mainCharacterId} />
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 pt-7">
          {showingCount < filtered.length ? (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="rounded-lg border border-hairline-2 bg-card px-[26px] py-[13px] font-display text-[14.5px] font-bold tracking-tight text-foreground transition-transform hover:-translate-y-0.5 hover:shadow-card"
            >
              Load more creators ↓
            </button>
          ) : null}
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-ink-faint uppercase">
            Showing {showingCount} of {filtered.length} creators
          </p>
        </div>
      </div>
    </>
  );
}

function Filters({
  scope,
  category,
  onScope,
  onCategory,
}: {
  scope: Scope;
  category: string;
  onScope: (scope: Scope) => void;
  onCategory: (category: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 pb-7">
      {SCOPES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onScope(s.value)}
          className={chipClass(scope === s.value)}
        >
          {s.label}
        </button>
      ))}

      <span className="mx-1.5 h-[22px] w-px bg-hairline-2" aria-hidden="true" />

      <button type="button" onClick={() => onCategory("all")} className={chipClass(category === "all")}>
        All categories
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onCategory(c)}
          className={chipClass(category === c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-[17px] py-[9px] text-[13.5px] font-medium transition-colors",
    active
      ? "border-foreground bg-foreground font-semibold text-background"
      : "border-hairline bg-card text-ink-soft hover:border-hairline-2 hover:text-foreground",
  );
}

function EmptyBoard({ isDaily }: { isDaily: boolean }) {
  // All-time copy is ported verbatim from the pre-V2 page — see AGENTS.md
  // brief. Today's-heat copy is new (this scope didn't exist before) but
  // matches its spirit: real numbers, no "no data available".
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-card px-6 py-12 text-center shadow-card">
      {isDaily ? (
        <>
          <p className="font-display text-lg font-bold">Nobody&apos;s caught fire today. Yet.</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Today&apos;s heat needs {DAILY_HEAT_BATTLES_REQUIRED} battles and at least{" "}
            {DAILY_HEAT_VOTERS_REQUIRED} different people before the UTC reset. Nobody&apos;s there yet.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-bold">The internet is still deciding.</p>
          <p className="max-w-sm text-sm text-ink-soft">
            A rank takes {PLACEMENT_BATTLES_REQUIRED} battles and at least {PLACEMENT_VOTERS_REQUIRED}{" "}
            different people. Nobody&apos;s there yet.
          </p>
        </>
      )}
      <Link
        href="/"
        className="rounded-lg bg-lime px-4 py-2 font-display text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:bg-lime-deep"
      >
        Start battling 🔥
      </Link>
    </div>
  );
}
