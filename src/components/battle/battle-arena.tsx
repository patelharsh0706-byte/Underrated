"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { nextBattle, pickWinner, type PickResult } from "@/app/actions/battle";
import { CreatorCard } from "@/components/battle/creator-card";
import type { PublicCreator } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type Pair = [PublicCreator, PublicCreator];

const RESULT_DISPLAY_MS = 700;
// A pick that didn't score needs long enough to read the reason.
const REPEAT_DISPLAY_MS = 1400;

/**
 * A face in the pulse row. These are creators who were picked in today's
 * battles — never voters. Voting is anonymous by design (no account required
 * to play), so voter faces do not exist and never will; each avatar links to
 * the creator's profile so what it represents is self-evident.
 */
export interface PulseFace {
  username: string;
  name: string;
  avatarUrl: string | null;
}

interface BattleArenaProps {
  initialPair: Pair;
  /** Real count from getHomeStats(). */
  battlesToday: number;
  faces: PulseFace[];
}

export function BattleArena({ initialPair, battlesToday, faces }: BattleArenaProps) {
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
        setTimeout(
          () => void advance(),
          pickResult.counted ? RESULT_DISPLAY_MS : REPEAT_DISPLAY_MS,
        );
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
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <div className="relative grid w-full grid-cols-2 gap-3 sm:gap-6">
        <CreatorCard
          creator={a}
          displayedAura={auraFor(a)}
          delta={deltaFor(a)}
          outcome={outcomeFor(a)}
          counted={result?.counted ?? true}
          disabled={phase !== "idle"}
          onPick={() => void handlePick(a.id, b.id)}
        />
        <CreatorCard
          creator={b}
          displayedAura={auraFor(b)}
          delta={deltaFor(b)}
          outcome={outcomeFor(b)}
          counted={result?.counted ?? true}
          disabled={phase !== "idle"}
          onPick={() => void handlePick(b.id, a.id)}
        />

        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-hairline-2 bg-card shadow-card sm:h-14 sm:w-14">
            <svg
              viewBox="0 0 74 74"
              fill="none"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full text-lime-deep"
            >
              <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                <path d="M37 4v9" />
                <path d="M37 61v9" />
                <path d="M9 37h9" />
                <path d="M56 37h9" />
                <path d="M15 15l6 6" />
                <path d="M53 53l6 6" />
                <path d="M59 15l-6 6" />
                <path d="M21 53l-6 6" />
              </g>
            </svg>
            <span className="relative font-display text-[10px] font-black tracking-tight italic sm:text-base">
              VS
            </span>
          </div>
        </div>
      </div>

      {/* Height is reserved so the page doesn't jump when this appears. A
          repeat pick is honest about doing nothing — see RANKING.md § Scoring. */}
      <div className="flex min-h-6 items-center justify-center text-center">
        {result && !result.counted ? (
          <span className="rounded-full border border-hairline-2 bg-card px-3 py-0.5 text-xs font-medium text-ink-soft shadow-card">
            You&apos;ve already called this one — Aura unchanged.
          </span>
        ) : null}
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-ink-soft">
        {faces.length > 0 ? (
          <span className="flex items-center">
            {faces.map((face, i) => (
              <Link
                key={face.username}
                href={`/c/${face.username}`}
                title={`${face.name} — picked today`}
                className={cn(
                  "relative block h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-muted transition-transform hover:z-10 hover:-translate-y-0.5",
                  i > 0 && "-ml-2.5",
                )}
              >
                {face.avatarUrl ? (
                  <Image
                    src={face.avatarUrl}
                    alt={face.name}
                    fill
                    sizes="32px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </Link>
            ))}
          </span>
        ) : null}

        <span className="font-display font-extrabold tracking-tight text-foreground">
          {battlesToday.toLocaleString()} picks today
        </span>

        <button
          type="button"
          onClick={() => void advance()}
          disabled={phase !== "idle"}
          className="text-ink-soft transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          Skip this battle →
        </button>
      </div>
    </div>
  );
}
