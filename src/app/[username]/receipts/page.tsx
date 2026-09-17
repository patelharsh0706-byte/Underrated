import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Scribble } from "@/components/scribble";
import { ReceiptsShareButton } from "@/components/receipts/share-button";
import { getAppOrigin } from "@/lib/app-url";
import { getUserId } from "@/lib/auth";
import { getProfileByUsername, getReceipts } from "@/lib/db/queries";
import { pickBestSpot } from "@/lib/receipts/best-spot";

// Public page — anyone can read someone's receipts, which is the point: the
// link is the share. It reads live rank, so it can never be static.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Receipts — Underhyped" };

  const who = profile.displayName ?? `@${profile.username}`;
  return {
    title: `${who}'s receipts — Underhyped`,
    description: `Proof of who ${who} backed before everyone else caught up.`,
  };
}

/** "Maya" → "Maya's", "Chris" → "Chris'". */
function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

export default async function PublicReceiptsPage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [receipts, viewerId, origin] = await Promise.all([
    getReceipts(profile.id),
    getUserId(),
    getAppOrigin(),
  ]);
  const best = pickBestSpot(receipts.spots);
  const isOwner = viewerId === profile.id;

  const who = profile.displayName ?? `@${profile.username}`;
  const stamp = new Date().toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pt-8 pb-20 sm:pt-12">
      {/* The whole page is one receipt: a narrow column, hairline rules for the
          tear lines, everything centred and tracked like dot-matrix print. */}
      <article className="relative rounded-card border border-hairline bg-card px-5 py-8 text-center shadow-card sm:px-10 sm:py-12">
        <p className="font-display text-[10px] font-bold tracking-[0.22em] text-ink-faint uppercase sm:text-[11px]">
          underhyped<span className="text-aura">.wtf</span>
        </p>

        <p className="mt-6 font-display text-[13px] font-bold tracking-[0.2em] uppercase sm:text-sm">
          🧾 Receipts
        </p>

        <h1 className="mt-1 font-display text-2xl font-black tracking-[-0.03em] uppercase sm:text-[32px]">
          {isOwner ? "Your eye this week" : `${possessive(who)} eye this week`}
        </h1>

        <div className="mt-7 flex flex-col gap-1">
          <p className="font-display text-3xl font-extrabold tabular-nums sm:text-[40px]">
            {receipts.battlesCount}
            <span className="ml-2 align-middle font-display text-[13px] font-semibold tracking-[0.12em] text-ink-soft uppercase sm:text-sm">
              battles played
            </span>
          </p>
          <p className="font-display text-3xl font-extrabold tabular-nums sm:text-[40px]">
            {receipts.spotsCount}
            <span className="ml-2 align-middle font-display text-[13px] font-semibold tracking-[0.12em] text-ink-soft uppercase sm:text-sm">
              people backed
            </span>
          </p>
        </div>

        <hr className="my-8 border-0 border-t border-dashed border-hairline-2" />

        {best ? (
          <section>
            <p className="font-display text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase sm:text-xs">
              Best call 👁
            </p>

            <Link
              href={`/c/${best.username}`}
              className="mt-3 inline-block font-display text-2xl font-black tracking-[-0.02em] uppercase transition-colors hover:text-aura sm:text-3xl"
            >
              {best.name}
            </Link>

            <p className="mt-5 font-display text-[12px] font-semibold tracking-[0.14em] text-ink-soft uppercase sm:text-[13px]">
              {isOwner ? "You spotted" : `${who} spotted`} {firstName(best.name)} at{" "}
              <span className="tabular-nums text-foreground">#{best.rankAtSpot}</span>
            </p>

            <p aria-hidden="true" className="mt-3 font-display text-2xl leading-none text-ink-faint">
              ↓
            </p>

            <p className="mt-3 font-display text-[12px] font-semibold tracking-[0.14em] text-ink-soft uppercase sm:text-[13px]">
              {possessive(firstName(best.name))} now{" "}
              <span className="font-black tabular-nums text-aura">#{best.currentRank}</span>
            </p>

            <Scribble side="right" lines={["called it."]} top={260} />
          </section>
        ) : (
          <section>
            <p className="font-display text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase sm:text-xs">
              Best call 👁
            </p>
            <p className="mx-auto mt-4 max-w-[34ch] text-sm text-ink-soft">
              {receipts.spots.length === 0
                ? isOwner
                  ? "Nothing spotted yet. Back someone in the arena and this is where the proof lands."
                  : "No calls yet."
                : "No receipts cashed yet — everyone spotted is still climbing."}
            </p>
          </section>
        )}

        <hr className="my-8 border-0 border-t border-dashed border-hairline-2" />

        <p className="font-display text-[13px] font-bold tracking-[0.24em] uppercase sm:text-sm">
          Spotted it.
        </p>
        <p className="mt-2 font-display text-[11px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
          {stamp}
        </p>
        <p className="mt-2 font-display text-[11px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
          Found here first.
        </p>
      </article>

      {receipts.spots.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">
            Every call
          </h2>
          <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
            {receipts.spots.map((spot) => (
              <li key={spot.creatorId} className="flex items-center gap-3 py-3">
                <span className="size-8 shrink-0 overflow-hidden rounded-full bg-muted">
                  {spot.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spot.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <Link
                  href={`/c/${spot.username}`}
                  className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-aura"
                >
                  {spot.name}
                </Link>
                <span className="shrink-0 font-display text-xs font-bold tabular-nums text-ink-soft">
                  {spot.rankAtSpot !== null && spot.currentRank !== null
                    ? `#${spot.rankAtSpot} → #${spot.currentRank}`
                    : spot.rankAtSpot !== null
                      ? `spotted at #${spot.rankAtSpot}`
                      : `backed at ${spot.auraAtSpot} Aura`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <div className="mt-8">
          <ReceiptsShareButton url={`${origin}/${profile.username}/receipts`} />
        </div>
      ) : (
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-full bg-primary px-5 py-3 font-display text-xs font-bold tracking-[0.07em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
          >
            Start your own receipts
          </Link>
        </div>
      )}
    </main>
  );
}
