import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ShareButton } from "@/components/profile/share-button";
import { clientEnv } from "@/lib/env";
import { getCreatorByUsername } from "@/lib/db/queries";

export const revalidate = 15;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) return {};

  const title = `${creator.name} — Underrated`;
  const description = `#${creator.rank} on Underrated with ${creator.aura} Aura.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) notFound();

  const profileUrl = `${clientEnv().NEXT_PUBLIC_APP_URL}/c/${creator.username}`;
  const socials = creator.socials ? Object.entries(creator.socials) : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-4 py-16">
      <div className="relative h-32 w-32 overflow-hidden rounded-xl border-2 border-foreground bg-muted sm:h-40 sm:w-40">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.name}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{creator.name}</h1>
        <span className="text-muted-foreground">@{creator.username}</span>
        {creator.category ? (
          <span className="mt-1 rounded-full border-2 border-foreground px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            {creator.category}
          </span>
        ) : null}
        {creator.bio ? (
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{creator.bio}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-8 rounded-xl border-2 border-foreground bg-card px-8 py-4">
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-aura">
            {creator.aura}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Aura</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-bold tabular-nums">#{creator.rank}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Rank</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {creator.winsCount}/{creator.battlesCount}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Wins</span>
        </div>
        {creator.followerCount !== null ? (
          <div className="flex flex-col items-center">
            <span className="font-mono text-2xl font-bold tabular-nums">
              {creator.followerCount.toLocaleString()}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Followers
            </span>
          </div>
        ) : null}
      </div>

      {creator.workUrl || socials.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {creator.workUrl ? (
            <a
              href={creator.workUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-foreground px-4 py-1.5 text-sm font-medium hover:bg-accent"
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
              className="rounded-full border-2 border-foreground px-4 py-1.5 text-sm font-medium capitalize hover:bg-accent"
            >
              {platform}
            </a>
          ))}
        </div>
      ) : null}

      <ShareButton url={profileUrl} />
    </main>
  );
}
