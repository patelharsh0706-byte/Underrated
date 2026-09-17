import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { ShareButton } from "@/components/profile/share-button";
import { getAppOrigin } from "@/lib/app-url";
import { getUserId } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your account — Underhyped",
  robots: { index: false },
};

export default async function AccountPage() {
  const userId = await getUserId();
  // /receipts is already the signed-out pitch — no second sign-in screen.
  if (!userId) redirect("/receipts");

  const profile = await getProfileByUserId(userId);
  if (!profile) redirect("/receipts");

  const origin = await getAppOrigin();
  const receiptsPath = `/${profile.username}/receipts`;
  const receiptsUrl = `${origin}${receiptsPath}`;

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pt-10 pb-24 sm:pt-14">
      <h1 className="font-display text-3xl font-black tracking-[-0.035em] sm:text-[44px]">
        Your account
      </h1>
      <p className="mt-2 font-display text-[13px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
        @{profile.username}
      </p>

      {/* Rows, not data. Everything about spots lives on the receipts page —
          duplicating the counters here would make two places to keep right. */}
      <nav className="mt-9 border-t border-hairline">
        <Link
          href={receiptsPath}
          className="group flex items-center justify-between gap-4 border-b border-hairline py-5 transition-colors hover:bg-foreground/[0.03]"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">
              🧾
            </span>
            <span className="font-display text-base font-extrabold tracking-[-0.01em] sm:text-lg">
              My receipts
            </span>
          </span>
          <span className="flex items-center gap-2 font-display text-[11px] font-bold tracking-[0.14em] text-ink-soft uppercase">
            Open
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </Link>

        <Link
          href="/"
          className="group flex items-center justify-between gap-4 border-b border-hairline py-5 transition-colors hover:bg-foreground/[0.03]"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">
              👁
            </span>
            <span className="font-display text-base font-extrabold tracking-[-0.01em] sm:text-lg">
              Back to the arena
            </span>
          </span>
          <span className="flex items-center gap-2 font-display text-[11px] font-bold tracking-[0.14em] text-ink-soft uppercase">
            Play
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </Link>
      </nav>

      <section className="mt-9">
        <h2 className="font-display text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">
          Your public link
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-card px-4 py-3 shadow-card">
          <code className="min-w-0 truncate font-mono text-[13px] text-ink-soft">
            {receiptsUrl.replace(/^https?:\/\//, "")}
          </code>
          <ShareButton url={receiptsUrl} label="Share" />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Anyone with this link can see who you backed, and when.
        </p>
      </section>

      <form action={signOut} className="mt-12">
        <button
          type="submit"
          className="font-display text-[11px] font-bold tracking-[0.16em] text-ink-soft uppercase transition-colors hover:text-loser"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
