"use client";

import { useState } from "react";

interface SponsorLogoProps {
  imageUrl: string | null;
  sponsorName: string;
}

// Small client island so a broken unavatar lookup (domain changed, favicon
// removed, service hiccup) — or a sponsor who chose no logo at all — both
// degrade to the same monogram instead of a broken image icon. Plain <img>,
// not next/image — onError-driven src fallback isn't a fit for the optimizer.
export function SponsorLogo({ imageUrl, sponsorName }: SponsorLogoProps) {
  const [failed, setFailed] = useState(false);
  const monogram = sponsorName.trim().replace(/^@/, "").charAt(0).toUpperCase() || "?";

  if (!imageUrl || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-foreground bg-muted text-sm font-bold text-muted-foreground">
        {monogram}
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-foreground bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={sponsorName}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
