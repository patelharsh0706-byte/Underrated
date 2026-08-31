"use client";

import Image from "next/image";

import type { PublicCreator } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type Outcome = "winner" | "loser" | null;

interface CreatorCardProps {
  creator: PublicCreator;
  displayedAura: number;
  delta: number | null;
  outcome: Outcome;
  disabled: boolean;
  onPick: () => void;
}

export function CreatorCard({
  creator,
  displayedAura,
  delta,
  outcome,
  disabled,
  onPick,
}: CreatorCardProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-label={`Pick ${creator.name} as more underrated`}
      className={cn(
        "group flex w-full flex-col items-center gap-4 rounded-xl border-2 border-foreground bg-card p-6 text-left transition-transform duration-150",
        "sm:p-8",
        !disabled && "hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
        disabled && "cursor-default",
        outcome === "winner" && "border-winner",
        outcome === "loser" && "opacity-60",
      )}
    >
      <div className="relative h-28 w-28 overflow-hidden rounded-xl border-2 border-foreground bg-muted sm:h-36 sm:w-36">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.name}
            fill
            sizes="144px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-xl font-bold sm:text-2xl">{creator.name}</span>
        <span className="text-sm text-muted-foreground">@{creator.username}</span>
        {creator.category ? (
          <span className="mt-1 rounded-full border-2 border-foreground px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            {creator.category}
          </span>
        ) : null}
        {creator.bio ? (
          <p className="mt-2 line-clamp-2 max-w-[24ch] text-sm text-muted-foreground">
            {creator.bio}
          </p>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold tabular-nums text-aura sm:text-3xl">
          {displayedAura}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          aura
        </span>
        {delta !== null ? (
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              outcome === "winner" ? "text-winner" : "text-loser",
            )}
          >
            {outcome === "winner" ? `+${delta}` : `-${delta}`}
          </span>
        ) : null}
      </div>
    </button>
  );
}
