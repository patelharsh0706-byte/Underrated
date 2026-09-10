import { cn } from "@/lib/utils";

import type { RankTitle } from "./rank-title";

/** Solid-fill rank title chip — see DESIGN.md § Components › Badges. */
export function RankBadge({ title, className }: { title: RankTitle; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-[5px] px-[7px] py-[3px] font-display text-[9.5px] font-bold tracking-[0.1em] text-primary-foreground uppercase",
        title.className,
        className,
      )}
    >
      {title.label}
    </span>
  );
}
