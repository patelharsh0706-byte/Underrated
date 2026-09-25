import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found — Underhyped",
};

// Mirrors error.tsx's centered layout. Server Component — nothing to reset.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        This page is underhyped. Like, it doesn&rsquo;t exist.
      </h1>
      <p className="text-sm text-ink-soft">
        Wrong link, or a creator who left the arena.
      </p>
      <Link
        href="/arena"
        className="mt-2 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/80"
      >
        Back to the arena
      </Link>
    </main>
  );
}
