"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { DomainLogo } from "@/components/domain-logo";
import type { PublicCreator } from "@/lib/db/queries";
import { isRanked } from "@/lib/ranking/placement";
import { getUnavatarUrl } from "@/lib/unavatar";
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

// Deterministic, not random — the same creator gets the same mark colour on
// every render, matching the design mockup's approach (picked by host string
// length rather than stored anywhere).
const MARK_COLORS = ["#B4603A", "#2F6BE0", "#6B5BD6", "#1D8E45", "#C4399E", "#0F7B7B"];

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function markColorFor(host: string): string {
  return MARK_COLORS[host.length % MARK_COLORS.length];
}

function handleFromSocialUrl(url: string): string {
  try {
    const segment = new URL(url).pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
    return segment || url;
  } catch {
    return url;
  }
}

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  youtube: "YouTube",
  spotify: "Spotify",
  tiktok: "TikTok",
  github: "GitHub",
};

/** Icon for the two platforms the design mockup draws one for; every other
 * allowed platform (see ALLOWED_SOCIALS) falls back to its two-letter mark —
 * no icon was designed for it rather than a low-effort guess at one. */
function SocialMark({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "twitter" || p === "x") {
    return <span className="text-[11px] leading-none">𝕏</span>;
  }
  if (p === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[13px] w-[13px]">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <span className="text-[9px] leading-none font-bold">
      {(SOCIAL_LABELS[p] ?? platform).slice(0, 2).toUpperCase()}
    </span>
  );
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
  const firstName = creator.name.split(" ")[0];
  const shownAura = useCountUp(displayedAura);
  const needsPlacement = !isRanked(creator.battlesCount, creator.voterCount);

  // Primary social first, rest in whatever order they were saved.
  const socialEntries = creator.socials
    ? Object.entries(creator.socials).sort(([a], [b]) =>
        a === creator.primarySocial ? -1 : b === creator.primarySocial ? 1 : 0,
      )
    : [];

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-card border border-hairline bg-card shadow-card transition-[opacity,transform,box-shadow] duration-200",
        outcome === "winner" && "scale-[1.02] shadow-lift ring-2 ring-winner",
        outcome === "loser" && "opacity-60",
      )}
    >
      {/* Battle portraits are a photo-forward banner crop, not the square
          identity-context avatar used elsewhere (profile page, post-payment
          card) — DESIGN.md Avatars. object-top so a tight 5:4 crop takes the
          bottom of the frame, never the head. */}
      <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-muted">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.name}
            fill
            sizes="(min-width: 640px) 380px, 50vw"
            className="object-cover object-top"
            unoptimized
          />
        ) : null}

        {/* Aura is always visible on the photo — DESIGN.md rule 8, "numbers
            are the decoration." It still animates in place via useCountUp;
            the delta badge below the fold is the separate "what just
            happened" feedback, not a restatement of this number. */}
        <div className="absolute top-2.5 right-2.5 rounded-[10px] bg-card px-2.5 py-1.5 text-center shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)]">
          <span className="block font-display text-sm leading-tight font-extrabold tracking-tight tabular-nums text-aura sm:text-[15px]">
            🔥 {shownAura}
          </span>
          <span className="mt-px block text-[9px] leading-tight font-medium tracking-[0.1em] text-ink-soft uppercase sm:text-[9.5px]">
            aura
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        {/* Identity block reads left-aligned, as in the V3 reference mock. */}
        <div className="flex flex-col items-start gap-1 text-left">
          <span className="font-display text-sm font-extrabold tracking-tight sm:text-xl">
            {creator.name}
          </span>
          <span className="hidden text-sm text-ink-soft sm:block">@{creator.username}</span>

          {needsPlacement || creator.category ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {needsPlacement ? (
                <span className="rounded-full bg-aura/12 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-aura uppercase sm:px-2 sm:text-xs">
                  New challenger
                </span>
              ) : null}
              {creator.category ? (
                <span className="rounded-full bg-foreground/6 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-soft uppercase sm:px-2 sm:text-xs">
                  {creator.category}
                </span>
              ) : null}
            </div>
          ) : null}

          {creator.bio ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-foreground sm:text-sm">
              {creator.bio}
            </p>
          ) : null}
        </div>

        {creator.workUrl ? (
          <a
            href={creator.workUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-lg bg-background px-2 py-1.5 transition-colors hover:bg-foreground/[0.04] sm:gap-2.5 sm:px-2.5 sm:py-2"
          >
            <DomainLogo
              imageUrl={getUnavatarUrl(creator.workUrl)}
              host={hostFromUrl(creator.workUrl)}
              markColor={markColorFor(hostFromUrl(creator.workUrl))}
              className="h-5 w-5 rounded-[7px] text-[10px] sm:h-7 sm:w-7 sm:rounded-lg sm:text-sm"
            />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[11px] font-semibold sm:text-[13.5px]">
                {hostFromUrl(creator.workUrl)}
              </span>
              <span className="hidden text-[10.5px] text-ink-soft sm:block">
                {creator.battlesCount} battles
              </span>
            </span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="hidden shrink-0 text-ink-faint sm:block"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        ) : null}

        {socialEntries.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {socialEntries.map(([platform, href]) => (
              <a
                key={platform}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline-2 px-2 py-1 text-[10.5px] font-semibold text-ink-soft transition-colors hover:border-foreground hover:text-foreground sm:px-2.5 sm:text-[11px]"
              >
                <SocialMark platform={platform} />
                <span className="max-w-[9ch] truncate">@{handleFromSocialUrl(href)}</span>
              </a>
            ))}
          </div>
        ) : null}

        {/* Height is reserved so the badge landing doesn't shove the button
            down — see the original note this replaced: a jump here moves
            the whole page twice per battle. */}
        <div className="flex min-h-6 items-center justify-center">
          {hasResult && counted ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                outcome === "winner" ? "bg-winner/12 text-winner" : "bg-loser/12 text-loser",
              )}
            >
              {outcome === "winner" ? `+${delta}` : `-${delta}`} Aura
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          aria-label={`Hype ${creator.name} as more underhyped`}
          className={cn(
            "mt-auto w-full rounded-[10px] bg-primary px-2 py-[11px] font-display text-[12.5px] font-bold tracking-[-0.01em] text-primary-foreground transition-transform sm:rounded-xl sm:px-3.5 sm:py-3 sm:text-sm",
            !disabled && "hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
            disabled && "cursor-default opacity-50",
          )}
        >
          Hype {firstName} ⚡
        </button>
      </div>
    </div>
  );
}
