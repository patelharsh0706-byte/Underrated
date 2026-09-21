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
    // Bottom-left of the portrait, not top-left: on a phone each battle card
    // is roughly half the viewport, and top-left put the pill into the Aura
    // badge (overlapping by 7px at 390px, 42px at 320px). The label stays
    // "Spot" in both states — spotted is the lime fill plus aria-pressed, and
    // changing the word would shift the pill's width mid-tap.
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSpotted}
      aria-label={`Spot ${firstName}`}
      className={cn(
        "absolute bottom-2.5 left-2.5 inline-flex h-11 items-center gap-1.5 rounded-full border px-3 transition-colors disabled:opacity-50",
        isSpotted
          ? "border-transparent bg-lime text-foreground"
          : "border-hairline bg-background text-foreground hover:bg-muted",
      )}
      title={`Spot ${firstName}`}
    >
      <span className="text-base leading-none" aria-hidden="true">
        👁
      </span>
      <span className="font-display text-[11px] leading-none font-bold tracking-[0.1em] uppercase">
        Spot
      </span>
    </button>
  );
}
