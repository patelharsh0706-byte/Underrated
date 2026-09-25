import Image from "next/image";
import Link from "next/link";

import type { PublicCreator } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export type Top10Entry = PublicCreator & {
  rank: number;
  dailyHeat?: number;
  battlesToday?: number;
  auraChangeToday?: number;
};

const DAILY_RANK_BADGES: Record<number, { label: string; className: string }> = {
  1: { label: "Main Character", className: "bg-aura" },
  2: { label: "Side Character", className: "bg-rank-second" },
  3: { label: "Plot Twist", className: "bg-rank-third" },
};

// The top three ranks get their badge colour on the number itself, so the
// podium reads at a glance without the badge having to be visible.
const RANK_NUMBER_COLORS: Record<number, string> = {
  1: "text-aura",
  2: "text-rank-second",
  3: "text-rank-third",
};

interface Top10PanelProps {
  entries: Top10Entry[];
  // "daily" = ranked by today's Daily Heat (Main Character eligible).
  // "aura" = fallback when nobody has hit the 5-battles-today floor yet —
  // ranked by all-time Aura instead, so the panel is never empty.
  mode: "daily" | "aura";
}

/**
 * Aura moved today — never rank movement. A creator padded in from the
 * all-time leaderboard has no number for today, and gets an em dash rather
 * than a fabricated zero. See RANKING.md § Rank movement.
 */
function TrendCell({ change }: { change: number | undefined }) {
  if (change === undefined) {
    return <span className="text-ink-faint">—</span>;
  }
  if (change === 0) {
    return <span className="text-ink-faint">—</span>;
  }

  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold tabular-nums",
        up ? "text-winner" : "text-down",
      )}
    >
      <span aria-hidden="true">{up ? "↑" : "↓"}</span>
      {up ? `+${change}` : change}
    </span>
  );
}

export function Top10Panel({ entries, mode }: Top10PanelProps) {
  return (
    <section className="flex w-full max-w-[1012px] flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
          {mode === "daily" ? "Hottest today" : "Top 10"}{" "}
          <span className="font-normal text-ink-soft">
            · {mode === "daily" ? "last 24h" : "by 🔥 Aura"}
          </span>
        </h2>
        <Link href="/leaderboard" className="text-sm font-medium text-ink-soft hover:underline">
          Full leaderboard →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline-2 px-6 py-8 text-center text-sm text-ink-soft">
          Nobody&apos;s racked up enough hype today. Go make someone the Main Character.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* No min-width below sm: Aura is the number people came for, and
              parking it behind a horizontal scroll on a phone hides it. The
              narrow layout drops Category and Trend instead. */}
          <table className="w-full border-collapse text-left sm:min-w-[560px]">
            <thead>
              <tr className="border-b border-hairline text-[10.5px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
                <th scope="col" className="w-8 py-2.5 pr-2 font-semibold">
                  #
                </th>
                <th scope="col" className="py-2.5 font-semibold">
                  Creator
                </th>
                <th scope="col" className="hidden py-2.5 pl-3 font-semibold sm:table-cell">
                  Category
                </th>
                <th scope="col" className="py-2.5 pl-3 text-right font-semibold">
                  Aura
                </th>
                <th
                  scope="col"
                  className="hidden w-20 py-2.5 pl-3 text-right font-semibold sm:table-cell"
                >
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const badge =
                  entry.dailyHeat !== undefined ? DAILY_RANK_BADGES[entry.rank] : undefined;

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-hairline transition-colors last:border-b-0 hover:bg-foreground/[0.025]"
                  >
                    <td className="py-3 pr-2 align-middle">
                      <span
                        className={cn(
                          "font-display text-sm font-extrabold tabular-nums",
                          RANK_NUMBER_COLORS[entry.rank] ?? "text-ink-soft",
                        )}
                      >
                        {entry.rank}
                      </span>
                    </td>

                    <td className="py-3 align-middle">
                      <Link href={`/c/${entry.username}`} className="flex items-center gap-3">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                          {entry.avatarUrl ? (
                            <Image
                              src={entry.avatarUrl}
                              alt={entry.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-display text-[15px] font-extrabold tracking-tight">
                              {entry.name}
                            </span>
                            <span className="text-[13px] text-ink-soft">@{entry.username}</span>
                            {badge ? (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase",
                                  badge.className,
                                )}
                              >
                                {badge.label}
                              </span>
                            ) : null}
                          </span>
                          {entry.bio ? (
                            <span className="mt-0.5 line-clamp-1 text-[13px] text-ink-soft">
                              {entry.bio}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </td>

                    <td className="hidden py-3 pl-3 align-middle sm:table-cell">
                      {entry.category ? (
                        <span className="inline-block rounded-full border border-hairline bg-card px-3 py-1 text-[12.5px] text-ink-soft">
                          {entry.category}
                        </span>
                      ) : null}
                    </td>

                    <td className="py-3 pl-3 text-right align-middle">
                      <span className="font-display text-[15px] font-extrabold tabular-nums whitespace-nowrap">
                        🔥 {entry.aura}
                      </span>
                    </td>

                    <td className="hidden py-3 pl-3 text-right align-middle text-[13px] whitespace-nowrap sm:table-cell">
                      <TrendCell change={entry.auraChangeToday} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
