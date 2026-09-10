import type { ReactNode } from "react";

/**
 * A lime highlighter stroke behind one word of the headline — see DESIGN.md
 * § Components › Marker swipe. One word per page; this page's word is
 * "creators." Scoped locally rather than promoted to a shared primitive
 * since it wasn't part of the Phase 1 primitive set (fonts/tokens/Scribble)
 * this rebuild is layered on — promote it if a second page needs it.
 */
export function MarkerSwipe({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block px-1 whitespace-nowrap">
      <span
        className="absolute inset-x-[-3px] top-[12%] bottom-[6%] -z-10 rotate-[-1deg] bg-lime [clip-path:polygon(1%_18%,100%_0%,99%_82%,0%_100%)]"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
