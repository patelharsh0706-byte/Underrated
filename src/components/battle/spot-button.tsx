"use client";

import { useState } from "react";

import { spotCreator } from "@/app/actions/spot";
import { cn } from "@/lib/utils";

interface SpotButtonProps {
  creatorId: string;
  firstName: string;
  spotted: boolean;
  isSignedIn: boolean;
  onSpot: () => void;
  onSignInPrompt: () => void;
}

export function SpotButton({
  creatorId,
  firstName,
  spotted,
  isSignedIn,
  onSpot,
  onSignInPrompt,
}: SpotButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isSpotted, setIsSpotted] = useState(spotted);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isSignedIn) {
      onSignInPrompt();
      return;
    }

    setIsPending(true);
    setIsSpotted(true); // optimistic update

    try {
      const result = await spotCreator({ creatorId });
      if (!result.ok) {
        setIsSpotted(false); // revert on error
        console.error("Spot failed:", result.reason);
      }
      onSpot();
    } catch (error) {
      setIsSpotted(false);
      console.error("Spot error:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    // A pill, not a bare icon: the eye alone read as decoration, and a 36px
    // circle sat under the 44px hit area DESIGN.md § Spot button requires.
    // Top-left of the portrait, matching the Aura badge's top-right — but on
    // a phone each battle card is roughly half the viewport, so the full
    // labelled pill collides with that badge (measured 7px overlap at 390px,
    // 42px at 320px). Below `sm` it collapses to the eye alone, still 44px;
    // the label returns from `sm` up where there's room for both. The label
    // stays "Spot" in both states — spotted is the lime fill plus
    // aria-pressed, and changing the word would shift the pill's width
    // mid-tap.
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSpotted}
      aria-label={`Spot ${firstName}`}
      className={cn(
        "absolute top-2.5 left-2.5 inline-flex size-11 items-center justify-center gap-1.5 rounded-full border transition-colors disabled:opacity-50 sm:w-auto sm:justify-start sm:px-3",
        isSpotted
          ? "border-transparent bg-lime text-foreground"
          : "border-hairline bg-background text-foreground hover:bg-muted",
      )}
      title={`Spot ${firstName}`}
    >
      <span className="text-base leading-none" aria-hidden="true">
        👁
      </span>
      <span className="hidden font-display text-[11px] leading-none font-bold tracking-[0.1em] uppercase sm:inline">
        Spot
      </span>
    </button>
  );
}
