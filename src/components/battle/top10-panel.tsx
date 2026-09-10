import Image from "next/image";
import Link from "next/link";

import type { PublicCreator } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export type Top10Entry = PublicCreator & {
  rank: number;
  dailyHeat?: number;
  battlesToday?: number;
};

const DAILY_RANK_BADGES: Record<number, { label: string; className: string }> = {
  1: { label: "Main Character", className: "bg-aura" },
  2: { label: "Side Character", className: "bg-rank-second" },
  3: { label: "Plot Twist", className: "bg-rank-third" },
};

interface Top10PanelProps {
  entries: Top10Entry[];
  // "daily" = ranked by today's Daily Heat (Main Character eligible).
  // "aura" = fallback when nobody has hit the 5-battles-today floor yet —
  // ranked by all-time Aura instead, so the panel is never empty.
  mode: "daily" | "aura";
}

export function Top10Panel({ entries, mode }: Top10PanelProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
          Top 10{" "}
          <span className="font-normal text-ink-soft">
            · {mode === "daily" ? "last 24h" : "by Aura🔥"}
          </span>
        </h2>
        <Link href="/leaderboard" className="text-sm font-medium text-ink-soft hover:underline">
          Full leaderboard →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline-2 px-6 py-8 text-center text-sm text-ink-soft">
          Nobody&apos;s racked up enough picks today. Go make someone the Main Character.
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/c/${entry.username}`}
                className={cn(
                  "flex items-center gap-3 rounded-card border border-hairline bg-card px-3 py-2 shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-lift",
                  entry.dailyHeat !== undefined && entry.rank === 1 && "border-aura/40",
                )}
              >
                <span className="w-6 shrink-0 text-right font-display text-sm font-extrabold tabular-nums text-ink-soft">
                  {entry.rank}
                </span>
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt={entry.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span className="min-w-0 truncate">{entry.name}</span>
                    {entry.dailyHeat !== undefined && DAILY_RANK_BADGES[entry.rank] ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground",
                          DAILY_RANK_BADGES[entry.rank].className,
                        )}
                      >
                        {DAILY_RANK_BADGES[entry.rank].label}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-ink-soft">
                    @{entry.username}
                    {entry.dailyHeat !== undefined ? ` · ${entry.battlesToday} battles today` : null}
                  </span>
                </div>
                {entry.dailyHeat !== undefined ? (
                  <span
                    className={cn(
                      "font-display text-sm font-extrabold tabular-nums",
                      entry.dailyHeat >= 0 ? "text-winner" : "text-down",
                    )}
                  >
                    {entry.dailyHeat > 0 ? `+${entry.dailyHeat}` : entry.dailyHeat}
                  </span>
                ) : (
                  <span className="font-display text-sm font-extrabold tabular-nums text-aura">
                    {entry.aura}🔥
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
