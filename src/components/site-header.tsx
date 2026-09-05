import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex flex-col gap-3 border-b-2 border-foreground px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
      <Link href="/" className="text-lg font-bold tracking-tight">
        underhyped<span className="text-aura">.wtf</span>
      </Link>
      {/* Plain gap-4, not gap-x-4/gap-y-1. The dev server serves CSS at a
          stable unhashed URL, so a browser holding a cached bundle keeps
          using it while the HTML updates — introducing a brand-new utility
          class there renders as zero spacing until the CSS cache clears.
          gap-4 was already in the bundle, so it survives that. */}
      <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/rules" className="hover:underline">
          Rules
        </Link>
        <Link href="/leaderboard" className="hover:underline">
          Leaderboard
        </Link>
        <Link
          href="/submit"
          className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"
        >
          Enter the arena
        </Link>
      </nav>
    </header>
  );
}
