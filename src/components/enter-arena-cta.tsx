import Link from "next/link";

import { SUBMISSION_FEE_CENTS } from "@/lib/creator-schema";

// Derived, not hardcoded — the fee already lives in one place, and a literal
// here would be a third copy free to drift from the real charge.
const FEE = `$${(SUBMISSION_FEE_CENTS / 100).toFixed(SUBMISSION_FEE_CENTS % 100 === 0 ? 0 : 2)}`;

/**
 * Deliberately cardless: this sits on the open ground between the battle and
 * the stats bar, so the lime button is the only thing carrying weight. A card
 * around it would put a second box directly under the two battle cards and
 * flatten the one moment the page wants you to look at.
 */
export function EnterArenaCta() {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center px-4 text-center">
      <Link
        href="/submit"
        className="w-full rounded-[14px] bg-lime px-10 py-4 font-display text-lg font-extrabold tracking-tight text-foreground shadow-[0_14px_34px_-14px_rgb(216_255_62)] transition-transform hover:-translate-y-0.5 hover:bg-lime-deep sm:w-auto sm:px-14 sm:py-5 sm:text-[22px]"
      >
        Enter the Arena →
      </Link>

      <p className="mt-5 text-sm text-ink-soft sm:text-[15px]">
        {FEE} to enter · the internet decides the rest
      </p>

      <p className="mt-3 font-display text-[11.5px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
        Discover · Pick · Boost · Repeat
      </p>
    </section>
  );
}
