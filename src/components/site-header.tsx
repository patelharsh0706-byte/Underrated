import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 sm:px-8">
      <Link href="/" className="text-lg font-bold tracking-tight">
        underrated<span className="text-aura">.lol</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium">
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
