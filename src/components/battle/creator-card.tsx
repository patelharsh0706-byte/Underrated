"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { PublicCreator } from "@/lib/db/queries";
import { isRanked } from "@/lib/ranking/placement";
import { cn } from "@/lib/utils";

const COUNT_UP_MS = 220;

// Aura changes count up rather than snapping — DESIGN.md calls for the
// number to animate in the Aura accent color instead of jumping instantly.
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    if (start === target) return;

    let raf: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / COUNT_UP_MS, 1);
      setValue(Math.round(start + (target - start) * progress));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevTarget.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

type Outcome = "winner" | "loser" | null;

interface CreatorCardProps {
  creator: PublicCreator;
  displayedAura: number;
  delta: number | null;
  outcome: Outcome;
  /** False when the pick didn't score — show the Aura, but never a fake delta. */
  counted: boolean;
  disabled: boolean;
  onPick: () => void;
}

const SOCIAL_LABELS: Record<string, string> = {
  twitter: "𝕏",
  x: "𝕏",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  spotify: "Spotify",
  tiktok: "TikTok",
  github: "GitHub",
};

function socialLabel(platform: string): string {
  return SOCIAL_LABELS[platform.toLowerCase()] ?? platform;
}

export function CreatorCard({
  creator,
  displayedAura,
  delta,
  outcome,
  counted,
  disabled,
  onPick,
}: CreatorCardProps) {
  const hasResult = delta !== null;
  const primaryHref =
    creator.primarySocial && creator.socials ? creator.socials[creator.primarySocial] : null;
  const firstName = creator.name.split(" ")[0];
  const shownAura = useCountUp(displayedAura);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-card border border-hairline bg-card p-3 shadow-card transition-[opacity,transform,box-shadow] duration-200",
        "sm:gap-4 sm:p-6",
        outcome === "winner" && "scale-[1.02] shadow-lift ring-2 ring-winner",
        outcome === "loser" && "opacity-60",
      )}
    >
      {/* Battle portraits are an identity context — DESIGN.md Avatars: square
          with 12px radius, never circular here. */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-36 sm:w-36">
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
        <span className="font-display text-sm font-extrabold tracking-tight sm:text-xl">
          {creator.name}
        </span>
        <span className="hidden text-sm text-ink-soft sm:block">@{creator.username}</span>
        {!isRanked(creator.battlesCount, creator.voterCount) ? (
          <span className="mt-1 rounded-full bg-aura/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aura sm:px-2 sm:text-xs">
            🔥 New challenger
          </span>
        ) : null}
        {creator.category ? (
          <span className="mt-1 rounded-full bg-foreground/6 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft sm:px-2 sm:text-xs">
            {creator.category}
          </span>
        ) : null}
        {creator.bio ? (
          <p className="mt-2 line-clamp-2 max-w-[24ch] text-xs text-ink-soft sm:text-sm">
            {creator.bio}
          </p>
        ) : null}
      </div>

      {creator.workUrl || primaryHref ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {creator.workUrl ? (
            <a
              href={creator.workUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-hairline-2 px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-foreground hover:text-foreground sm:px-3"
            >
              ↗ View work
            </a>
          ) : null}
          {primaryHref ? (
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-hairline-2 px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-foreground hover:text-foreground sm:px-3"
            >
              {socialLabel(creator.primarySocial!)}
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Slot is always present, and reserves its height even when empty, so
          the card doesn't grow by ~43px the moment a result lands — that jump
          shoves the whole page down twice per battle. */}
      <div className="flex min-h-7 flex-wrap items-baseline justify-center gap-1.5 sm:min-h-9 sm:gap-2">
        {hasResult ? (
          <>
            <span className="font-display text-base font-extrabold tabular-nums text-aura sm:text-3xl">
              {shownAura}🔥
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              aura
            </span>
            {counted ? (
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  outcome === "winner" ? "text-winner" : "text-loser",
                )}
              >
                {outcome === "winner" ? `+${delta}` : `-${delta}`}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        aria-label={`Pick ${creator.name} as more underhyped`}
        className={cn(
          "mt-auto w-full rounded-lg bg-primary py-2 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground transition-transform sm:py-3 sm:text-sm",
          !disabled && "hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
          disabled && "cursor-default opacity-50",
        )}
      >
        Pick {firstName} 🔥
      </button>
    </div>
  );
}
