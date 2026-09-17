import Link from "next/link";

import { AccountAvatar } from "@/components/auth/account-avatar";
import { MobileNav, type NavLink } from "@/components/mobile-nav";

// V2 shell — see DESIGN.md § Page Inventory and DECISIONS.md § 2026-09-10
// (V2 visual direction). Ported from the design mockup's .masthead: Archivo
// wordmark + tagline lockup, a plain nav row, and the lime-era pill CTA.
//
// The mockup's nav also carries a "Nominate" link. Nominations are recorded
// as NOT V1 in MVP.md and DECISIONS.md — that entry was written this same
// session — so it's intentionally left out here rather than ported.
//
// Below `sm` the nav collapses into <MobileNav>, the header's only client
// island (DECISIONS.md § 2026-09-11). It carries the active-route highlight;
// the desktop nav still doesn't, because that would need the pathname and
// make this whole component a Client Component on every page in the tree.
const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/receipts", label: "Receipts" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 sm:gap-6 sm:px-8 sm:pt-[22px] sm:pb-[18px]">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          underhyped<span className="text-aura">.wtf</span>
        </Link>
        <p className="font-display text-[8px] leading-tight font-semibold tracking-[0.1em] text-ink-faint uppercase sm:text-[9.5px] sm:tracking-[0.13em] sm:whitespace-nowrap">
          Talented people deserve more hype.
        </p>
      </div>

      <nav className="hidden items-center gap-6 text-[14.5px] font-medium sm:flex">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="text-ink-soft transition-colors hover:text-foreground">
            {label}
          </Link>
        ))}
      </nav>

      {/* On mobile the lockup is flex-1 so the pill hugs the hamburger; the
          panel that MobileNav renders wraps under the row via `order-3 w-full`. */}
      <Link
        href="/submit"
        className="inline-block shrink-0 rounded-full bg-primary px-2.5 py-2 font-display text-[10.5px] font-bold tracking-[0.07em] whitespace-nowrap text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 sm:px-[18px] sm:py-[11px] sm:text-xs"
      >
        Enter the arena
      </Link>

      {/* Renders nothing when signed out, so the anonymous header is unchanged.
          Sits between the CTA and the hamburger so the wrapping flex row still
          fits at 360px. */}
      <AccountAvatar />

      <MobileNav links={NAV_LINKS} />
    </header>
  );
}
