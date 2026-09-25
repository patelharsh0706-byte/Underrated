import type { ReactNode } from "react";

/**
 * A lime highlighter stroke behind one word of the headline — see DESIGN.md
 * § Components › Marker swipe. One word per page: "creators." on the
 * leaderboard, "radar." / "card." / "in." across the Enter the Arena steps.
 * Promoted out of components/leaderboard once that second page needed it.
 */
export function MarkerSwipe({ children }: { children: ReactNode }) {
  return (
    // Dark ink in both themes — the word sits on lime, which never flips.
    <span className="relative inline-block px-1 whitespace-nowrap text-[#111]">
      <span
        className="absolute inset-x-[-3px] top-[12%] bottom-[6%] -z-10 rotate-[-1deg] bg-lime [clip-path:polygon(1%_18%,100%_0%,99%_82%,0%_100%)]"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
