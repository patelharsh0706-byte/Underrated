import Link from "next/link";

import { SUBMISSION_FEE_CENTS } from "@/lib/creator-schema";

// Derived, not hardcoded — the fee already lives in one place, and a literal
// here would be a third copy free to drift from the real charge.
const FEE = `$${(SUBMISSION_FEE_CENTS / 100).toFixed(SUBMISSION_FEE_CENTS % 100 === 0 ? 0 : 2)}`;

export function EnterArenaCta() {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-card border border-hairline bg-card px-6 py-8 text-center shadow-card">
      <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
        Think you&apos;re underhyped?
      </h2>
      <p className="text-sm text-ink-soft">Join the arena and let the internet decide.</p>
      <Link
        href="/submit"
        className="mt-3 w-full rounded-lg bg-lime px-6 py-3 font-display text-sm font-bold tracking-tight text-foreground transition-transform hover:-translate-y-0.5 hover:bg-lime-deep sm:w-auto sm:px-10"
      >
        Enter the arena →
      </Link>
      <p className="text-xs text-ink-soft">{FEE} to enter</p>
    </section>
  );
}
