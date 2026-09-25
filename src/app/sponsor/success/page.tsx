import { redirect } from "next/navigation";
import Link from "next/link";

import { SponsorLogo } from "@/components/sponsor-logo";
import { getActiveSponsorship } from "@/lib/db/queries";

// Must reflect the sponsorship that was just inserted, not a build-time
// snapshot — same class of bug as the homepage needing force-dynamic.
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function SponsorSuccessPage() {
  const sponsorship = await getActiveSponsorship();
  if (!sponsorship) redirect("/sponsor");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re live 🔦</h1>
        <p className="text-sm text-muted-foreground">
          {sponsorship.sponsorName} is the Underhyped spotlight for the next 30
          days — through {formatDate(sponsorship.endAt)}.
        </p>
      </div>

      <div className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-card px-4 py-3">
        <SponsorLogo imageUrl={sponsorship.imageUrl} sponsorName={sponsorship.sponsorName} />
        <span className="flex flex-1 flex-col items-start overflow-hidden text-left">
          <span className="truncate text-sm font-bold">{sponsorship.sponsorName}</span>
          {sponsorship.description ? (
            <span className="truncate text-xs text-muted-foreground">
              {sponsorship.description}
            </span>
          ) : null}
        </span>
        <span className="rounded-full bg-aura px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
          Sponsored
        </span>
      </div>

      <Link
        href="/arena"
        className="w-full rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        See it live in the Arena →
      </Link>
    </main>
  );
}
