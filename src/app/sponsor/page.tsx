import type { Metadata } from "next";

import { SponsorForm } from "@/components/sponsor/sponsor-form";
import { getActiveSponsorship, getNextSponsorshipStart } from "@/lib/db/queries";

// Availability changes when someone buys the slot — same reasoning as
// /leaderboard's ISR window, so this never goes stale until the next deploy.
export const revalidate = 15;

export const metadata: Metadata = {
  title: "Sponsor Underhyped",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function SponsorPage() {
  const [active, nextStart] = await Promise.all([
    getActiveSponsorship(),
    getNextSponsorshipStart(),
  ]);

  const isBookedNow = active !== null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sponsor Underhyped</h1>
        <p className="text-sm text-muted-foreground">
          One slot. Homepage. 30 days. Clearly labeled &quot;Sponsored&quot; — it
          never touches anyone&apos;s rank.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border-2 border-foreground bg-card p-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold">
            {active ? `Booked through ${formatDate(active.endAt)}` : "Available now"}
          </span>
          {isBookedNow ? (
            <span className="text-xs text-muted-foreground">
              Next open date: {formatDate(nextStart)}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-2xl font-bold text-aura">$30</span>
      </div>

      <SponsorForm nextStart={nextStart.toISOString()} />
    </main>
  );
}
