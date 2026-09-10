import Link from "next/link";

// V2 shell — see DESIGN.md § Page Inventory and DECISIONS.md § 2026-09-10
// (V2 visual direction). Ported from the design mockup's .masthead: Archivo
// wordmark + tagline lockup, a plain nav row, and the lime-era pill CTA.
//
// The mockup's nav also carries a "Nominate" link. Nominations are recorded
// as NOT V1 in MVP.md and DECISIONS.md — that entry was written this same
// session — so it's intentionally left out here rather than ported.
//
// No active-route highlighting yet: the mockup's `.here` state needs the
// current pathname, which would make this a Client Component on every page
// in the tree. V1's header didn't highlight the active link either, so this
// isn't a regression — just deferred until it earns "use client" on its own.
export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:gap-6 sm:px-8 sm:pt-[22px] sm:pb-[18px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          underhyped<span className="text-aura">.wtf</span>
        </Link>
        <p className="whitespace-nowrap font-display text-[8px] font-semibold tracking-[0.1em] text-ink-faint uppercase sm:text-[9.5px] sm:tracking-[0.13em]">
          Talented people deserve more hype.
        </p>
      </div>

      <nav className="order-3 flex w-full items-center justify-between gap-3 text-[13.5px] font-medium sm:order-none sm:w-auto sm:justify-start sm:gap-6 sm:text-[14.5px]">
        <Link href="/" className="text-ink-soft transition-colors hover:text-foreground">
          Arena
        </Link>
        <Link href="/leaderboard" className="text-ink-soft transition-colors hover:text-foreground">
          Leaderboard
        </Link>
        <Link href="/about" className="text-ink-soft transition-colors hover:text-foreground">
          About
        </Link>
        <Link href="/rules" className="text-ink-soft transition-colors hover:text-foreground">
          Rules
        </Link>
      </nav>

      <Link
        href="/submit"
        className="inline-block rounded-full bg-primary px-[14px] py-[9px] font-display text-[11.5px] font-bold tracking-[0.07em] whitespace-nowrap text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 sm:px-[18px] sm:py-[11px] sm:text-xs"
      >
        Enter the arena
      </Link>
    </header>
  );
}
