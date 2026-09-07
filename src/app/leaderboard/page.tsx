import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getLeaderboard } from "@/lib/db/queries";
import {
  PLACEMENT_BATTLES_REQUIRED,
  PLACEMENT_VOTERS_REQUIRED,
} from "@/lib/ranking/placement";

// Ratings change with every vote; a short revalidate window keeps this page
// mostly cached without ever going stale for long. See ARCHITECTURE.md.
export const revalidate = 15;

export const metadata: Metadata = {
  title: "Leaderboard — Underhyped",
  description: "Creators ranked by Aura🔥.",
};

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">Ranked by Aura🔥.</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-foreground/40 px-6 py-12 text-center">
          <p className="font-bold">The internet is still deciding.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A rank takes {PLACEMENT_BATTLES_REQUIRED} battles and at least{" "}
            {PLACEMENT_VOTERS_REQUIRED} different people. Nobody&apos;s there yet.
          </p>
          <Link
            href="/"
            className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"
          >
            Start battling 🔥
          </Link>
        </div>
      ) : null}

      <ol className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/c/${entry.username}`}
              className="flex items-center gap-4 rounded-xl border-2 border-foreground bg-card px-4 py-3 transition-transform hover:-translate-y-0.5"
            >
              <span className="w-8 shrink-0 text-right font-mono text-lg font-bold tabular-nums text-muted-foreground">
                {entry.rank}
              </span>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-foreground bg-muted">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt={entry.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate font-bold">{entry.name}</span>
                <span className="truncate text-sm text-muted-foreground">@{entry.username}</span>
              </div>
              <span className="font-mono text-lg font-bold tabular-nums text-aura">
                {entry.aura}🔥
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
