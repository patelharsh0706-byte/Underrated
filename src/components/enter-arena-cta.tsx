import Link from "next/link";

import { SUBMISSION_FEE_CENTS } from "@/lib/creator-schema";

// Derived, not hardcoded — the fee already lives in one place, and a literal
// here would be a third copy free to drift from the real charge.
const FEE = `$${(SUBMISSION_FEE_CENTS / 100).toFixed(SUBMISSION_FEE_CENTS % 100 === 0 ? 0 : 2)}`;

export function EnterArenaCta() {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-xl border-2 border-foreground bg-card px-6 py-6 text-center">
      <h2 className="text-lg font-bold tracking-tight sm:text-xl">
        Think you&apos;re underhyped?
      </h2>
      <p className="text-sm text-muted-foreground">
        Join the arena and let the internet decide.
      </p>
      <Link
        href="/submit"
        className="mt-2 rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"
      >
        Enter the arena →
      </Link>
      <p className="text-xs text-muted-foreground">{FEE} to enter</p>
    </section>
  );
}
