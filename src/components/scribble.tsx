import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface ScribbleProps {
  side: "left" | "right";
  /** Each string renders as its own line. */
  lines: string[];
  /** Desktop (>1040px) offset from the top, in px. */
  top: number;
  /**
   * Offsets at each breakpoint, in px. Default to a fixed step down from
   * `top` — close enough for most heroes without per-page tuning. Pass
   * these explicitly when a page's hero is short enough that the default
   * step collides with something below it.
   */
  topAt1040?: number;
  topAt760?: number;
  topAt560?: number;
  className?: string;
}

/**
 * Handwritten marginalia — DESIGN.md's "hand-annotated" brand element. Two
 * per page maximum, one per side; comments on the page, never carries
 * information the page needs — hence aria-hidden.
 *
 * Stays pinned to the outer margin at every width (narrower, unrotated,
 * closer to the page edge) rather than collapsing into inline flow. The
 * left note's pointing arrow is dropped below 760px — inline it would
 * point at nothing — while the right note's underline stays, since an
 * underline still reads correctly at any width.
 */
export function Scribble({
  side,
  lines,
  top,
  topAt1040 = top - 12,
  topAt760 = top - 34,
  topAt560 = top - 42,
  className,
}: ScribbleProps) {
  const style = {
    "--scribble-top": `${top}px`,
    "--scribble-top-1040": `${topAt1040}px`,
    "--scribble-top-760": `${topAt760}px`,
    "--scribble-top-560": `${topAt560}px`,
  } as CSSProperties;

  return (
    <div
      className={cn("scribble", side === "left" ? "scribble-left" : "scribble-right", className)}
      style={style}
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      ))}
      {side === "left" ? <ScribbleArrow /> : <ScribbleUnderline />}
    </div>
  );
}

function ScribbleArrow() {
  return (
    <svg width="46" height="34" viewBox="0 0 46 34" fill="none">
      <path d="M2 3c10 14 22 22 40 25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42 28l-8-2m8 2l-3-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ScribbleUnderline() {
  return (
    <svg width="72" height="10" viewBox="0 0 72 10" fill="none">
      <path d="M2 6c18-4 46-5 68-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
