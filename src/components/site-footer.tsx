import Link from "next/link";

// V2 shell — see site-header.tsx for the same note on scope. The mockup's
// footer tagline reads "Good people deserve more hype" while the header
// reads "Talented people deserve more hype" — that split is deliberate
// (confirmed in design review), not a typo to reconcile.
export function SiteFooter() {
  return (
    <footer className="mt-14 flex flex-wrap items-start justify-between gap-6 border-t border-hairline-2 px-4 pt-[26px] pb-11 sm:px-8">
      <div className="flex flex-col">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
          underhyped<span className="text-aura">.wtf</span>
        </Link>
        <p className="mt-1.5 font-display text-[11px] font-semibold tracking-[0.16em] text-ink-faint uppercase">
          Good people deserve more hype.
        </p>
      </div>

      <div className="flex gap-[22px] text-sm">
        <Link href="/about" className="text-ink-soft hover:text-foreground hover:underline">
          About
        </Link>
        <Link href="/rules" className="text-ink-soft hover:text-foreground hover:underline">
          Rules
        </Link>
        <Link href="/leaderboard" className="text-ink-soft hover:text-foreground hover:underline">
          Leaderboard
        </Link>
      </div>

      <Link
        href="https://x.com/HarshPatel502"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-ink-soft hover:underline"
      >
        Made with love <span className="text-aura">@HarshPatel502</span>
      </Link>
    </footer>
  );
}
