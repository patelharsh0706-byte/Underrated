"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { nextBattle, pickWinner, type PickResult } from "@/app/actions/battle";
import { CreatorCard } from "@/components/battle/creator-card";
import type { PublicCreator } from "@/lib/db/queries";

type Pair = [PublicCreator, PublicCreator];

const RESULT_DISPLAY_MS = 700;

interface BattleArenaProps {
  initialPair: Pair;
}

export function BattleArena({ initialPair }: BattleArenaProps) {
  const [current, setCurrent] = useState<Pair>(initialPair);
  const [result, setResult] = useState<PickResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "picking" | "result">("idle");
  const nextPairRef = useRef<Pair | null>(null);
  const prefetchInFlight = useRef(false);

  const prefetchNext = useCallback(async () => {
    if (prefetchInFlight.current) return;
    prefetchInFlight.current = true;
    try {
      const pair = await nextBattle();
      nextPairRef.current = pair;
    } catch {
      // Prefetch failures are silent — we retry when the current battle resolves.
    } finally {
      prefetchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void prefetchNext();
  }, [prefetchNext]);

  const advance = useCallback(async () => {
    setResult(null);
    setPhase("idle");

    if (nextPairRef.current) {
      setCurrent(nextPairRef.current);
      nextPairRef.current = null;
      void prefetchNext();
      return;
    }

    try {
      const pair = await nextBattle();
      setCurrent(pair);
    } catch {
      // Nothing we can do without active creators — leave the current pair on screen.
    }
  }, [prefetchNext]);

  const handlePick = useCallback(
    async (winnerId: string, loserId: string) => {
      if (phase !== "idle") return;
      setPhase("picking");

      try {
        const pickResult = await pickWinner({ winnerId, loserId });
        setResult(pickResult);
        setPhase("result");
        setTimeout(() => void advance(), RESULT_DISPLAY_MS);
      } catch {
        // The pair is likely stale (a creator went inactive mid-battle).
        // Skip it rather than leaving the user stuck.
        void advance();
      }
    },
    [phase, advance],
  );

  const [a, b] = current;

  const auraFor = (creator: PublicCreator) => {
    if (!result) return creator.aura;
    if (result.winnerId === creator.id) return result.winnerAura;
    if (result.loserId === creator.id) return result.loserAura;
    return creator.aura;
  };

  const outcomeFor = (creator: PublicCreator) => {
    if (!result) return null;
    if (result.winnerId === creator.id) return "winner" as const;
    if (result.loserId === creator.id) return "loser" as const;
    return null;
  };

  const deltaFor = (creator: PublicCreator) => {
    if (!result) return null;
    if (result.winnerId === creator.id || result.loserId === creator.id) {
      return result.delta;
    }
    return null;
  };

  return (
    <div className="relative grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
      <CreatorCard
        creator={a}
        displayedAura={auraFor(a)}
        delta={deltaFor(a)}
        outcome={outcomeFor(a)}
        disabled={phase !== "idle"}
        onPick={() => void handlePick(a.id, b.id)}
      />
      <CreatorCard
        creator={b}
        displayedAura={auraFor(b)}
        delta={deltaFor(b)}
        outcome={outcomeFor(b)}
        disabled={phase !== "idle"}
        onPick={() => void handlePick(b.id, a.id)}
      />

      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-background text-sm font-bold sm:h-14 sm:w-14 sm:text-base">
          VS
        </div>
      </div>
    </div>
  );
}
