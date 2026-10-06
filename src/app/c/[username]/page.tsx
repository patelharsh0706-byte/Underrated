import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileView } from "@/components/profile/profile-view";
import { isMockMode } from "@/lib/db/mock-data";
import { draftProfile } from "@/lib/profile/draft-profile";
import { getPreviewMe } from "@/lib/profile/preview-me";
import { getProfileV2, type ProfileV2 } from "@/lib/profile/queries";

// PREVIEW_MOCK=1: your own @handle (from X sign-in) has no sample row, so it is
// drawn from your X sign-in data instead — no database.
async function loadProfile(username: string): Promise<ProfileV2 | null> {
  const found = await getProfileV2(username);
  if (found || !isMockMode()) return found;
  const mine = await getPreviewMe();
  if (!mine || mine.me.handle.toLowerCase() !== username.toLowerCase()) return null;
  return draftProfile(mine.me, mine.draft);
}

// Profile v2 — DECISIONS.md § 2026-10-04 "Onboarding from X and profile v2".
// Who is viewing (owner? already hyped?) is resolved in the browser, so this
// page stays cached for everyone. PREVIEW_MOCK=1 serves sample people.

export const revalidate = 15;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await loadProfile(username);
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
  const profile = await loadProfile(username);
  if (!profile) notFound();

  return (
    <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8 sm:py-10">
      <ProfileView profile={profile} />
    </main>
  );
}
