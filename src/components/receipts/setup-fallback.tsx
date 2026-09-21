import Link from "next/link";

/**
 * Shown to a signed-in user whose profile could not be created just now —
 * see getOrCreateProfile in lib/receipts/profile.ts. Deliberately not the
 * signed-out pitch: they are signed in, and telling them to sign in was the
 * trap this replaces. Reloading retries the self-heal.
 */
export function ReceiptsSetupFallback() {
  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pt-16 pb-24 text-center">
      <p className="font-display text-[11px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        🧾 Receipts
      </p>
      <h1 className="mt-3 font-display text-3xl font-black tracking-[-0.035em] sm:text-[40px]">
        We couldn&rsquo;t set up your receipts.
      </h1>
      <p className="mx-auto mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
        You&rsquo;re signed in — this is on our side. Try again in a moment; your picks are
        safe and will be here when it works.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/receipts"
          className="rounded-[14px] bg-lime px-6 py-3 font-display text-sm font-bold tracking-wide text-foreground transition-colors hover:bg-lime-deep"
        >
          TRY AGAIN →
        </Link>
        <Link href="/" className="text-sm text-ink-soft underline underline-offset-4 hover:text-foreground">
          Back to the Arena
        </Link>
      </div>
    </main>
  );
}
