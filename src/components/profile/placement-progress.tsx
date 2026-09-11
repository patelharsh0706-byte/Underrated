import { PLACEMENT_BATTLES_REQUIRED, PLACEMENT_VOTERS_REQUIRED } from "@/lib/ranking/placement";

interface PlacementProgressProps {
  battlesCount: number;
  voterCount: number;
}

/**
 * Shown instead of a rank while a creator is still in placement. Two
 * conditions gate a rank, so this shows whichever one is unmet — a creator
 * with 13 battles from 2 people needs to see the people, not a full bar.
 * See RANKING.md § Placement.
 */
export function PlacementProgress({ battlesCount, voterCount }: PlacementProgressProps) {
  const needsBattles = battlesCount < PLACEMENT_BATTLES_REQUIRED;

  const [current, required, label] = needsBattles
    ? [battlesCount, PLACEMENT_BATTLES_REQUIRED, "placement battles"]
    : [voterCount, PLACEMENT_VOTERS_REQUIRED, "people deciding"];

  const percent = Math.min(100, Math.round((current / required) * 100));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="rounded-full bg-aura/12 px-3 py-1 text-[11px] font-bold tracking-wide text-aura uppercase">
        🔥 New challenger
      </span>
      <span className="font-display text-sm font-bold tabular-nums text-foreground">
        {current}/{required} {label}
      </span>
      <div className="h-[9px] w-32 overflow-hidden rounded-full border border-hairline-2 bg-card">
        <div
          className="h-full bg-aura transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="max-w-[30ch] text-center text-[12.5px] font-medium text-ink-soft">
        {needsBattles
          ? "The internet is still deciding."
          : "A rank takes more than a few people. The internet is still deciding."}
      </p>
    </div>
  );
}
