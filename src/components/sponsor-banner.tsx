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
        className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-card border border-dashed border-hairline-2 px-6 py-8 text-center transition-colors hover:border-foreground/40"
      >
        <span className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
          Feeling your startup is underhyped too?
        </span>
        <span className="text-sm text-ink-soft">Own the only sponsor spot on Underhyped.</span>
        <span className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
          <span className="font-display font-bold text-aura">$30 · 30 days</span>
          <span className="rounded-lg bg-lime px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground">
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
      className="flex w-full max-w-3xl items-center gap-4 rounded-card border border-hairline bg-card px-5 py-4 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <span className="rounded-full bg-aura px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
        Sponsored
      </span>
      <SponsorLogo imageUrl={sponsorship.imageUrl} sponsorName={sponsorship.sponsorName} />
      <span className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate font-display text-sm font-bold">{sponsorship.sponsorName}</span>
        {sponsorship.description ? (
          <span className="truncate text-xs text-ink-soft">{sponsorship.description}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs text-ink-soft">↗</span>
    </a>
  );
}
