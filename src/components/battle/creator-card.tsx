"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { PublicCreator } from "@/lib/db/queries";
import { PLACEMENT_BATTLES_REQUIRED } from "@/lib/ranking/placement";
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

function formatFollowers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(count);
}

export function CreatorCard({
  creator,
  displayedAura,
  delta,
  outcome,
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
        "flex w-full flex-col items-center gap-4 rounded-xl border-2 border-foreground bg-card p-6 transition-[opacity,transform,box-shadow] duration-200",
        "sm:p-8",
        outcome === "winner" && "scale-[1.02] border-winner shadow-[0_0_0_3px_var(--winner)]",
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
        {creator.battlesCount < PLACEMENT_BATTLES_REQUIRED ? (
          <span className="mt-1 rounded-full border-2 border-aura bg-aura/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-aura">
            🔥 New challenger
          </span>
        ) : null}
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

      {creator.workUrl || primaryHref ? (
        <div className="flex flex-wrap justify-center gap-2">
          {creator.workUrl ? (
            <a
              href={creator.workUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-foreground px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              ↗ View work
            </a>
          ) : null}
          {primaryHref ? (
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-foreground px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              {socialLabel(creator.primarySocial!)}
            </a>
          ) : null}
        </div>
      ) : null}

      {hasResult ? (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tabular-nums text-aura sm:text-3xl">
            {shownAura}🔥
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            aura🔥
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              outcome === "winner" ? "text-winner" : "text-loser",
            )}
          >
            {outcome === "winner" ? `+${delta}` : `-${delta}`}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
            {creator.followerCount !== null ? formatFollowers(creator.followerCount) : "—"}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            followers
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        aria-label={`Pick ${creator.name} as more underhyped`}
        className={cn(
          "w-full rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform",
          !disabled && "hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
          disabled && "cursor-default opacity-50",
        )}
      >
        Pick {firstName} 🔥
      </button>
    </div>
  );
}
