"use client";

import { useState } from "react";
import { spotCreator } from "@/app/actions/spot";

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
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isSpotted}
      aria-label={`Spot ${firstName}`}
      className={`absolute top-2.5 left-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
        isSpotted
          ? "bg-lime-400 text-gray-900"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } disabled:opacity-50`}
      title={`Spot ${firstName}`}
    >
      <span className="text-base">👁</span>
    </button>
  );
}
