import Link from "next/link";

import type { ActiveSponsorship } from "@/lib/db/queries";
import { SponsorLogo } from "@/components/sponsor-logo";

interface SponsorBannerProps {
  sponsorship: ActiveSponsorship | null;
}

export function SponsorBanner({ sponsorship }: SponsorBannerProps) {
  if (!sponsorship) {
    return (
      <Link
        href="/sponsor"
        className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-xl border-2 border-dashed border-foreground/30 px-6 py-8 text-center hover:border-foreground"
      >
        <span className="text-lg font-bold tracking-tight sm:text-xl">
          Feeling your startup is underhyped too?
        </span>
        <span className="text-sm text-muted-foreground">
          Own the only sponsor spot on Underhyped.
        </span>
        <span className="mt-3 flex items-center gap-3">
          <span className="font-mono font-bold text-aura">$30 · 30 days</span>
          <span className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            Take the spotlight →
          </span>
        </span>
      </Link>
    );
  }

  return (
    <a
      href={sponsorship.targetUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex w-full max-w-3xl items-center gap-4 rounded-xl border-2 border-foreground bg-card px-5 py-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="rounded-full bg-aura px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
        Sponsored
      </span>
      <SponsorLogo imageUrl={sponsorship.imageUrl} sponsorName={sponsorship.sponsorName} />
      <span className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-bold">{sponsorship.sponsorName}</span>
        {sponsorship.description ? (
          <span className="truncate text-xs text-muted-foreground">
            {sponsorship.description}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">↗</span>
    </a>
  );
}
