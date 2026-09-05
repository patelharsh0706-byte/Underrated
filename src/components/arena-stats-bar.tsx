interface ArenaStatsBarProps {
  battlesToday: number;
  creatorsInArena: number;
}

export function ArenaStatsBar({ battlesToday, creatorsInArena }: ArenaStatsBarProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-lg font-bold tabular-nums sm:text-xl">
          {battlesToday.toLocaleString()}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Battles today
        </span>
      </div>

      <div className="hidden h-px flex-1 bg-foreground/15 sm:block" />

      <p className="text-sm font-bold text-muted-foreground">Real people. Real opinions.</p>

      <div className="hidden h-px flex-1 bg-foreground/15 sm:block" />

      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-lg font-bold tabular-nums sm:text-xl">
          {creatorsInArena.toLocaleString()}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Creators in the arena
        </span>
      </div>
    </section>
  );
}
