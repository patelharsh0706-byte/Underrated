import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 sm:px-8">
      <Link href="/" className="text-lg font-bold tracking-tight">
        underhyped<span className="text-aura">.wtf</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/rules" className="hover:underline">
          Rules
        </Link>
        <Link href="/leaderboard" className="hover:underline">
          Leaderboard
        </Link>
        <Link href="/submit" className="hover:underline">
          Submit yourself
        </Link>
      </nav>
    </header>
  );
}
