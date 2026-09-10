interface ArenaStatsBarProps {
  battlesToday: number;
  creatorsInArena: number;
}

export function ArenaStatsBar({ battlesToday, creatorsInArena }: ArenaStatsBarProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-lg font-extrabold tracking-tight tabular-nums sm:text-2xl">
          {battlesToday.toLocaleString()}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-ink-soft">Battles today</span>
      </div>

      <div className="hidden h-px flex-1 bg-hairline sm:block" />

      <p className="font-display text-sm font-semibold text-ink-soft">
        Real people. Real opinions.
      </p>

      <div className="hidden h-px flex-1 bg-hairline sm:block" />

      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-lg font-extrabold tracking-tight tabular-nums sm:text-2xl">
          {creatorsInArena.toLocaleString()}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-ink-soft">
          Creators in the arena
        </span>
      </div>
    </section>
  );
}
