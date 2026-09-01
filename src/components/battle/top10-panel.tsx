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
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          Top 10{" "}
          <span className="text-muted-foreground font-normal">
            · {mode === "daily" ? "last 24h" : "by Aura"}
          </span>
        </h2>
        <Link href="/leaderboard" className="text-sm font-medium hover:underline">
          Full leaderboard →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-foreground/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Nobody&apos;s racked up enough picks today. Go make someone the Main Character.
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/c/${entry.username}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-foreground bg-card px-3 py-2 transition-transform hover:-translate-y-0.5",
                  entry.dailyHeat !== undefined && entry.rank === 1 && "border-aura",
                )}
              >
                <span className="w-6 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-muted-foreground">
                  {entry.rank}
                </span>
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border-2 border-foreground bg-muted">
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
                  <span className="flex items-center gap-1.5 truncate text-sm font-bold">
                    {entry.name}
                    {entry.dailyHeat !== undefined && DAILY_RANK_BADGES[entry.rank] ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground",
                          DAILY_RANK_BADGES[entry.rank].className,
                        )}
                      >
                        {DAILY_RANK_BADGES[entry.rank].label}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{entry.username}
                    {entry.dailyHeat !== undefined ? ` · ${entry.battlesToday} battles today` : null}
                  </span>
                </div>
                {entry.dailyHeat !== undefined ? (
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      entry.dailyHeat >= 0 ? "text-winner" : "text-loser",
                    )}
                  >
                    {entry.dailyHeat > 0 ? `+${entry.dailyHeat}` : entry.dailyHeat}
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold tabular-nums text-aura">
                    {entry.aura}
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
