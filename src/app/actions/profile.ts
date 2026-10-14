"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getSignedInAccount, getVoter } from "@/lib/account";
import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { creators, profileHypes } from "@/lib/db/schema";
import { cleanLink, EDITABLE_LINKS, type EditableLink } from "@/lib/profile/links";
import { profileEditSchema } from "@/lib/profile/options";
import { getPreviewMe, PREVIEW_DRAFT_COOKIE, PREVIEW_LINKS_COOKIE } from "@/lib/profile/preview-me";
import { hasProfileHype } from "@/lib/profile/queries";
import { updateCreatorProfile } from "@/lib/profile/write";

// Profile v2 writes — DECISIONS.md § 2026-10-04 "Onboarding from X and profile v2".

export interface MyProfileState {
  signedIn: boolean;
  /** The creator username this account owns, if any. */
  myUsername: string | null;
  /** Whether this account already hyped the creator being viewed. */
  hyped: boolean;
}

/** Called by a profile page in the browser: is this profile mine, did I hype it? */
export async function getMyProfileState(input: { creatorId?: string }): Promise<MyProfileState> {
  if (isMockMode()) {
    const mine = await getPreviewMe();
    return { signedIn: !!mine, myUsername: mine?.me.handle ?? null, hyped: false };
  }
  const account = await getSignedInAccount();
  if (!account) return { signedIn: false, myUsername: null, hyped: false };
  let myUsername: string | null = null;
  if (account.creatorId) {
    const [row] = await db.select({ username: creators.username }).from(creators).where(eq(creators.id, account.creatorId));
    myUsername = row?.username ?? null;
  }
  const creatorId = z.uuid().safeParse(input.creatorId);
  const hyped = creatorId.success ? await hasProfileHype(creatorId.data, account.id) : false;
  return { signedIn: true, myUsername, hyped };
}

export interface HypeResult {
  counted: boolean;
  needsSignIn?: boolean;
  needsProfile?: boolean;
  error?: string;
  hypes?: number;
}

/** "⚡ Hype {name}" — one per account per creator; adds to Hype, never to Aura or rank. */
export async function hypeCreator(input: { creatorId: string }): Promise<HypeResult> {
  const parsed = z.object({ creatorId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { counted: false, error: "That profile didn’t look right." };
  const voter = await getVoter();
  if (voter.kind === "signed-out") return { counted: false, needsSignIn: true };
  if (voter.kind === "needs-profile") return { counted: false, needsProfile: true };
  if (isMockMode()) return { counted: true };
  const userId = voter.userId;
  if (voter.creatorId === parsed.data.creatorId) return { counted: false, error: "That’s you — share your profile instead." };
  const inserted = await db
    .insert(profileHypes)
    .values({ creatorId: parsed.data.creatorId, userId })
    .onConflictDoNothing({ target: [profileHypes.creatorId, profileHypes.userId] })
    .returning({ id: profileHypes.id });
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profileHypes)
    .where(eq(profileHypes.creatorId, parsed.data.creatorId));
  return { counted: inserted.length > 0, hypes: n };
}

/** Edit profile — only the signed-in owner, only their own creator. */
export async function updateMyProfile(input: unknown): Promise<{ error?: string; ok?: boolean }> {
  const parsed = profileEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something didn’t look right." };
  if (isMockMode()) {
    // Preview: your own profile is drawn from the draft cookie — keep it there.
    const mine = await getPreviewMe();
    if (!mine) return { error: "Preview mode — nothing is saved." };
    (await cookies()).set(PREVIEW_DRAFT_COOKIE, JSON.stringify(parsed.data), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    return { ok: true };
  }
  const account = await getSignedInAccount();
  if (!account?.creatorId) return { error: "Sign in with the X account that owns this profile." };
  await updateCreatorProfile(account.creatorId, parsed.data);
  const [row] = await db.select({ username: creators.username }).from(creators).where(eq(creators.id, account.creatorId));
  if (row) revalidatePath(`/c/${row.username}`);
  return { ok: true };
}

export interface SaveLinksResult {
  ok?: boolean;
  /** Per chip — the chip turns red and the first note is shown. */
  errors?: Partial<Record<EditableLink, string>>;
  error?: string;
  socials?: Record<string, string>;
}

const linksInput = z.partialRecord(z.enum(EDITABLE_LINKS), z.string().max(400));

/**
 * The link chips' one Save: every changed chip at once. "" removes a link.
 * X ("twitter") is never touched — it's locked to the sign-in.
 */
export async function saveMyLinks(input: unknown): Promise<SaveLinksResult> {
  const parsed = linksInput.safeParse(input);
  if (!parsed.success) return { error: "Something didn’t look right." };
  const errors: Partial<Record<EditableLink, string>> = {};
  const clean: Partial<Record<EditableLink, string>> = {};
  for (const [kind, raw] of Object.entries(parsed.data) as [EditableLink, string][]) {
    const r = cleanLink(kind, raw);
    if ("error" in r) errors[kind] = r.error;
    else clean[kind] = r.url;
  }
  if (Object.keys(errors).length) return { errors };

  const merge = (before: Record<string, string>) => {
    const next = { ...before };
    for (const [kind, url] of Object.entries(clean)) {
      if (url) next[kind] = url;
      else delete next[kind];
    }
    return next;
  };

  if (isMockMode()) {
    const mine = await getPreviewMe();
    if (!mine) return { error: "Preview mode — sign in with X to try this." };
    const socials = merge(mine.links);
    (await cookies()).set(PREVIEW_LINKS_COOKIE, JSON.stringify(socials), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    return { ok: true, socials };
  }

  const account = await getSignedInAccount();
  if (!account?.creatorId) return { error: "Sign in with the X account that owns this profile." };
  const creatorId = account.creatorId;
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select({ socials: creators.socials, username: creators.username }).from(creators).where(eq(creators.id, creatorId)).for("update");
    if (!row) return null;
    const socials = merge((row.socials ?? {}) as Record<string, string>);
    await tx.update(creators).set({ socials }).where(eq(creators.id, creatorId));
    return { socials, username: row.username };
  });
  if (!result) return { error: "Profile not found." };
  revalidatePath(`/c/${result.username}`);
  return { ok: true, socials: result.socials };
}
