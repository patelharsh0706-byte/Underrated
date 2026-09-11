import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { RankBadge } from "./rank-badge";
import { rankTitleFor } from "./rank-title";
import type { RankedEntry } from "./types";

interface RankRowProps {
  entry: RankedEntry;
  isDaily: boolean;
  mainCharacterId: string | null;
}

export function RankRow({ entry, isDaily, mainCharacterId }: RankRowProps) {
  const title = rankTitleFor(entry.rank, entry.id, mainCharacterId);
  const metricText = isDaily
    ? entry.metric > 0
      ? `+${entry.metric}`
      : `${entry.metric}`
    : entry.metric.toLocaleString();

  return (
    <Link
      href={`/c/${entry.username}`}
      className="grid grid-cols-[22px_1fr_auto] items-center gap-2.5 border-b border-hairline px-1 py-[11px] transition-colors hover:bg-foreground/[0.03] sm:grid-cols-[30px_1fr_148px_104px] sm:gap-4 sm:px-1 sm:py-[13px]"
    >
      <span className="font-display text-[13px] font-extrabold text-ink-soft tabular-nums sm:text-[15px]">
        {entry.rank}
      </span>

      <span className="flex min-w-0 items-center gap-2.5 sm:gap-[13px]">
        <span className="relative size-[34px] shrink-0 overflow-hidden rounded-full bg-muted sm:size-[42px]">
          {entry.avatarUrl ? (
            <Image
              src={entry.avatarUrl}
              alt={entry.name}
              fill
              sizes="42px"
              className="object-cover"
              unoptimized
            />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
              {entry.name}
            </span>
            <span className="hidden truncate text-[13.5px] text-ink-soft sm:inline">
              @{entry.username}
            </span>
            {title ? <RankBadge title={title} /> : null}
          </span>
          <span className="block truncate text-xs text-ink-soft sm:text-[13.5px]">
            {entry.bio}
          </span>
        </span>
      </span>

      <span className="hidden truncate rounded-full border border-hairline px-3 py-1 text-[12.5px] font-medium text-ink-soft sm:block sm:justify-self-start">
        {entry.category}
      </span>

      <span
        className={cn(
          "justify-self-end font-display text-sm font-extrabold tracking-tight tabular-nums sm:text-lg",
          isDaily ? (entry.metric >= 0 ? "text-winner" : "text-down") : "text-aura",
        )}
      >
        {!isDaily ? "🔥" : null}
        {metricText}
      </span>
    </Link>
  );
}
