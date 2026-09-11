"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface DomainLogoProps {
  /** unavatar domain-lookup URL, or null when there's nothing to look up. */
  imageUrl: string | null;
  /** Host the logo belongs to — seeds the monogram and the alt text. */
  host: string;
  /** Solid colour behind the monogram fallback. */
  markColor: string;
  className?: string;
}

/**
 * A site's real favicon/logo, falling back to the deterministic colour mark
 * it replaces.
 *
 * The fallback is the point. unavatar's anonymous tier is rate-limited per
 * visitor IP and a domain may simply have no favicon, so a missing logo is an
 * ordinary outcome, not an error — it degrades to exactly what this showed
 * before logos existed rather than to a broken-image icon. Plain <img>, not
 * next/image: an onError-driven src fallback isn't a fit for the optimizer,
 * same as components/sponsor-logo.tsx.
 */
export function DomainLogo({ imageUrl, host, markColor, className }: DomainLogoProps) {
  const [failed, setFailed] = useState(false);
  const monogram = host.replace(/^www\./, "").charAt(0).toUpperCase() || "?";

  if (!imageUrl || failed) {
    return (
      <span
        className={cn(
          "grid flex-none place-items-center font-display font-extrabold text-card",
          className,
        )}
        style={{ background: markColor }}
        aria-hidden="true"
      >
        {monogram}
      </span>
    );
  }

  return (
    <span
      className={cn("relative flex-none overflow-hidden bg-card", className)}
      style={{ background: markColor }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${host} logo`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
