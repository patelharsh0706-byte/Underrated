import Image from "next/image";
import Link from "next/link";

import { projectMark } from "@/lib/project-mark";
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

  const project = projectMark(entry.workUrl, entry.projectName);

  // # · Creator · Cooking · Category · Aura — DESIGN.md § Leaderboard. The
  // last three are equal-width tracks, so the space between them is even.
  // Under 768px: # · Creator · project tile · Aura.
  return (
    <Link
      href={`/c/${entry.username}`}
      className="grid grid-cols-[22px_minmax(0,1fr)_28px_auto] md:grid-cols-[30px_minmax(0,1fr)_repeat(3,132px)] lg:grid-cols-[30px_minmax(0,1fr)_repeat(3,172px)] items-center gap-2.5 border-b border-hairline px-1 py-[11px] transition-colors hover:bg-foreground/[0.03] md:gap-4 md:py-[13px]"
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

      {/* Cooking: the creator's project — like the profile's link, no label. */}
      <span className="flex min-w-0 items-center gap-2.5" title={project?.site}>
        {project ? (
          <>
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-lg font-display text-[12.5px] font-extrabold text-white md:size-[34px] md:rounded-[9px] md:text-[15px]"
              style={{ background: project.color }}
            >
              {project.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden min-w-0 md:block">
              <span className="block truncate text-[14.5px] font-semibold">{project.name}</span>
              {/* No own name: the name already is the site, so it isn't repeated. */}
              {project.name !== project.site ? <span className="block truncate text-xs text-ink-soft">🔗 {project.site}</span> : null}
            </span>
          </>
        ) : null}
      </span>

      <span className="hidden max-w-full truncate justify-self-start rounded-full border border-hairline px-3 py-1 text-[12.5px] font-medium text-ink-soft md:block">
        {entry.category}
      </span>

      <span
        className={cn(
          "justify-self-end font-display text-sm font-extrabold tracking-tight tabular-nums md:justify-self-start md:text-lg",
          isDaily ? (entry.metric >= 0 ? "text-winner" : "text-down") : "text-aura",
        )}
      >
        {!isDaily ? "🔥" : null}
        {metricText}
      </span>
    </Link>
  );
}
