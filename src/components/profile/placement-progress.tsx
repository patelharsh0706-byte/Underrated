import { PLACEMENT_BATTLES_REQUIRED } from "@/lib/ranking/placement";

interface PlacementProgressProps {
  battlesCount: number;
}

/** Shown instead of a rank while a creator is still in placement. */
export function PlacementProgress({ battlesCount }: PlacementProgressProps) {
  const percent = Math.min(100, Math.round((battlesCount / PLACEMENT_BATTLES_REQUIRED) * 100));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="rounded-full border-2 border-aura bg-aura/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-aura">
        🔥 New challenger
      </span>
      <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground">
        {battlesCount}/{PLACEMENT_BATTLES_REQUIRED} placement battles
      </span>
      <div className="h-2 w-40 overflow-hidden rounded-full border-2 border-foreground bg-card">
        <div className="h-full bg-aura transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">The internet is still deciding.</p>
    </div>
  );
}
