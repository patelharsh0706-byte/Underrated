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
      <span className="rounded-full border-2 border-aura bg-aura/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-aura">
        🔥 New challenger
      </span>
      <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground">
        {current}/{required} {label}
      </span>
      <div className="h-2 w-40 overflow-hidden rounded-full border-2 border-foreground bg-card">
        <div className="h-full bg-aura transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {needsBattles
          ? "The internet is still deciding."
          : "A rank takes more than a few people. The internet is still deciding."}
      </p>
    </div>
  );
}
