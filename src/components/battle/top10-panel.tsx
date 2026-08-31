import Image from "next/image";
import Link from "next/link";

import type { DailyHeatEntry } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface Top10PanelProps {
  entries: DailyHeatEntry[];
}

export function Top10Panel({ entries }: Top10PanelProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          Top 10 <span className="text-muted-foreground font-normal">· last 24h</span>
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
                  entry.rank === 1 && "border-aura",
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
                    {entry.rank === 1 ? (
                      <span className="rounded-full bg-aura px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        Main Character
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{entry.username} · {entry.battlesToday} battles today
                  </span>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular-nums",
                    entry.dailyHeat >= 0 ? "text-winner" : "text-loser",
                  )}
                >
                  {entry.dailyHeat > 0 ? `+${entry.dailyHeat}` : entry.dailyHeat}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
