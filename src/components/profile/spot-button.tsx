"use client";

import { useEffect, useState } from "react";

import { getMySpotAction, spotCreator } from "@/app/actions/spot";
import { ReceiptsPrompt } from "@/components/receipts/receipts-prompt";
import { createClient } from "@/lib/supabase/client";

interface ProfileSpotButtonProps {
  creatorId: string;
  creatorName: string;
}

/**
 * Island component: the profile page stays ISR and cookie-free, so auth is
 * resolved client-side via a local session-cache read, not an RSC call.
 */
export function ProfileSpotButton({ creatorId, creatorName }: ProfileSpotButtonProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSpotted, setIsSpotted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const signedIn = data.session !== null;
      setIsSignedIn(signedIn);
      if (signedIn) {
        void getMySpotAction(creatorId).then((spot) => {
          if (!cancelled && spot) setIsSpotted(true);
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const handleClick = async () => {
    if (!isSignedIn) {
      setShowPrompt(true);
      return;
    }
    if (isSpotted || isPending) return;

    setIsPending(true);
    setIsSpotted(true); // optimistic update

    try {
      const result = await spotCreator({ creatorId });
      if (!result.ok) setIsSpotted(false); // revert on error
    } catch {
      setIsSpotted(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isPending}
        aria-pressed={isSpotted}
        aria-label={isSpotted ? `${creatorName}, spotted` : `Spot ${creatorName}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          isSpotted
            ? "border-lime-400 bg-lime-400 text-gray-900"
            : "border-hairline-2 bg-card text-ink-soft hover:border-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden="true">👁</span>
        {isSpotted ? "Spotted" : "Spot"}
      </button>

      <ReceiptsPrompt
        variant="spot"
        firstName={creatorName.split(" ")[0]}
        isOpen={showPrompt}
        onDismiss={() => setShowPrompt(false)}
      />
    </>
  );
}
