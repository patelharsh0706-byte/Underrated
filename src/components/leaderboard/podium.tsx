import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { RankBadge } from "./rank-badge";
import { rankTitleFor } from "./rank-title";
import type { RankedEntry } from "./types";

interface PodiumProps {
  /** Exactly three entries, already in rank order [1st, 2nd, 3rd]. */
  top3: [RankedEntry, RankedEntry, RankedEntry];
  isDaily: boolean;
  mainCharacterId: string | null;
}

// Rank 1 renders visually raised and lime, dead center — DOM order is
// [2nd, 1st, 3rd] so a plain 3-column grid places the tallest card in the
// middle without any absolute positioning.
export function Podium({ top3, isDaily, mainCharacterId }: PodiumProps) {
  const [first, second, third] = top3;
  return (
    <section
      className="mb-8 grid grid-cols-[1fr_1.12fr_1fr] items-end gap-2 sm:mb-12 sm:gap-4"
      aria-label="Top three creators"
    >
      <PodiumCard entry={second} isDaily={isDaily} mainCharacterId={mainCharacterId} />
      <PodiumCard entry={first} isDaily={isDaily} mainCharacterId={mainCharacterId} first />
      <PodiumCard entry={third} isDaily={isDaily} mainCharacterId={mainCharacterId} />
    </section>
  );
}

function PodiumCard({
  entry,
  isDaily,
  mainCharacterId,
  first = false,
}: {
  entry: RankedEntry;
  isDaily: boolean;
  mainCharacterId: string | null;
  first?: boolean;
}) {
  const title = rankTitleFor(entry.rank, entry.id, mainCharacterId);
  const metricText = isDaily
    ? entry.metric > 0
      ? `+${entry.metric}`
      : `${entry.metric}`
    : entry.metric.toLocaleString();

  return (
    <Link
      href={`/c/${entry.username}`}
      className={cn(
        "flex flex-col items-center gap-1 rounded-card p-3 pb-4 text-center shadow-card transition-transform hover:-translate-y-0.5 sm:items-start sm:gap-[7px] sm:p-[18px] sm:pb-5 sm:text-left",
        first
          ? "bg-lime p-4 pb-5 shadow-[0_2px_4px_rgba(17,17,17,0.05),0_26px_46px_-18px_rgba(150,190,20,0.65)] sm:p-6 sm:pb-[26px]"
          : "bg-card",
      )}
    >
      <span
        className={cn(
          "font-display text-lg leading-none font-black tracking-tight",
          first ? "sm:text-[32px]" : "sm:text-[26px]",
        )}
      >
        {entry.rank}
      </span>

      <div className="flex w-full flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full bg-muted",
            first ? "size-12 sm:size-[92px]" : "size-10 sm:size-[74px]",
          )}
        >
          {entry.avatarUrl ? (
            <Image
              src={entry.avatarUrl}
              alt={entry.name}
              fill
              sizes="92px"
              className="object-cover"
              unoptimized
            />
          ) : null}
        </span>

        <div className="flex flex-col items-center sm:items-end">
          {first ? (
            <span className="hidden font-hand text-[13px] leading-tight font-bold tracking-wide text-ink-soft uppercase sm:block">
              most underhyped
              <br />
              right now.
            </span>
          ) : null}
          <b
            className={cn(
              "block font-display font-extrabold tracking-tight tabular-nums",
              isDaily ? (entry.metric >= 0 ? "text-winner" : "text-down") : "text-aura",
              first ? "text-base sm:text-[26px]" : "text-sm sm:text-[22px]",
            )}
          >
            {!isDaily ? "🔥" : null}
            {metricText}
          </b>
        </div>
      </div>

      <h3
        className={cn(
          "w-full truncate font-display font-extrabold tracking-tight",
          first ? "text-base sm:text-2xl" : "text-sm sm:text-xl",
        )}
      >
        {entry.name}
      </h3>
      <p className="w-full truncate text-[11px] text-ink-soft sm:-mt-1 sm:text-sm">
        @{entry.username}
      </p>

      {title ? <RankBadge title={title} /> : null}

      {entry.bio ? (
        <p className="hidden text-sm leading-snug text-foreground sm:mt-0.5 sm:line-clamp-2 sm:block">
          {entry.bio}
        </p>
      ) : null}

      {entry.category ? (
        <span
          className={cn(
            "mt-1.5 rounded-full border border-hairline px-2.5 py-[3px] text-[8.5px] font-bold tracking-[0.09em] text-ink-soft uppercase sm:self-start sm:rounded-full sm:border sm:px-3 sm:py-1 sm:text-[12.5px] sm:font-medium sm:tracking-normal sm:normal-case",
            first && "sm:border-[rgba(17,17,17,0.14)] sm:bg-white/55 sm:text-foreground",
          )}
        >
          {entry.category}
        </span>
      ) : null}
    </Link>
  );
}
