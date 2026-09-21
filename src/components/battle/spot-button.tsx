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
    // Same recipe as the Aura badge opposite it (creator-card.tsx: rounded
    // corners, card fill, that exact shadow, px-2.5 py-1.5, a stacked
    // number-line + caption) rather than a pill — a flat ground-fill pill
    // sat lighter than Aura's white card + shadow and read as smaller next
    // to it even though its box was measured no smaller. Two lines mirrors
    // Aura's own icon-line + label-line shape, which is what makes the pair
    // read as equally weighted. Spotted swaps the fill to lime; the caption
    // never changes, so the pill's footprint doesn't shift mid-tap.
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSpotted}
      aria-label={`Spot ${firstName}`}
      className={cn(
        "absolute top-2.5 left-2.5 min-h-11 min-w-11 rounded-[10px] px-2 py-1.5 text-center shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)] transition-colors disabled:opacity-50 sm:px-2.5",
        isSpotted ? "bg-lime" : "bg-card hover:bg-muted",
      )}
      title={`Spot ${firstName}`}
    >
      <span className="block text-sm leading-tight sm:text-[15px]" aria-hidden="true">
        👁
      </span>
      <span className="mt-px block text-[9px] leading-tight font-medium tracking-[0.1em] text-ink-soft uppercase sm:text-[9.5px]">
        spot
      </span>
    </button>
  );
}
