import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PlacementProgress } from "@/components/profile/placement-progress";
import { ShareButton } from "@/components/profile/share-button";
import { getAppOrigin } from "@/lib/app-url";
import { getCreatorByUsername } from "@/lib/db/queries";
import { isMockMode, mockCreatorProfile } from "@/lib/db/mock-data";

// PREVIEW_MOCK=1 — see src/lib/db/mock-data.ts. Temporary, for viewing the
// frontend without a live database.
async function fetchCreator(username: string) {
  return isMockMode() ? mockCreatorProfile(username) : getCreatorByUsername(username);
}

export const revalidate = 15;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await fetchCreator(username);
  if (!creator) return {};

  const title = `${creator.name} — Underhyped`;
  const description =
    creator.rank !== null
      ? `#${creator.rank} on Underhyped with 🔥 ${creator.aura} Aura.`
      : `New challenger on Underhyped with 🔥 ${creator.aura} Aura — still being placed.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const creator = await fetchCreator(username);
  if (!creator) notFound();

  // See getAppOrigin — deliberately not NEXT_PUBLIC_APP_URL, which took this
  // page down in production once already.
  const profileUrl = `${await getAppOrigin()}/c/${creator.username}`;
  const socials = creator.socials ? Object.entries(creator.socials) : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 py-12 sm:py-16">
      <div className="w-full rounded-card bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
            {creator.avatarUrl ? (
              <Image
                src={creator.avatarUrl}
                alt={creator.name}
                fill
                sizes="112px"
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col items-center gap-1 sm:items-start">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[26px]">
              {creator.name}
            </h1>
            <span className="text-sm font-medium text-ink-soft">@{creator.username}</span>

            {creator.category ? (
              <span className="mt-1 rounded-full border border-hairline bg-card px-3 py-1 text-xs font-medium text-ink-soft">
                {creator.category}
              </span>
            ) : null}

            {creator.bio ? (
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-foreground sm:max-w-none">
                {creator.bio}
              </p>
            ) : null}

            {creator.workUrl || socials.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {creator.workUrl ? (
                  <a
                    href={creator.workUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-foreground"
                  >
                    ↗ View work
                  </a>
                ) : null}
                {socials.map(([platform, href]) => (
                  <a
                    key={platform}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-hairline-2 bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft capitalize transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-around gap-5 rounded-lg bg-foreground/[0.035] px-4 py-4 sm:px-6">
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-xl font-extrabold tracking-tight text-aura tabular-nums sm:text-2xl">
              🔥 {creator.aura}
            </span>
            <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">Aura</span>
          </div>

          {creator.rank !== null ? (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
                #{creator.rank}
              </span>
              <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">Rank</span>
            </div>
          ) : (
            <PlacementProgress
              battlesCount={creator.battlesCount}
              voterCount={creator.voterCount}
            />
          )}

          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
              {creator.winsCount}/{creator.battlesCount}
            </span>
            <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">Wins</span>
          </div>

          {creator.followerCount !== null ? (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
                {creator.followerCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">
                Followers
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <ShareButton url={profileUrl} />
    </main>
  );
}
