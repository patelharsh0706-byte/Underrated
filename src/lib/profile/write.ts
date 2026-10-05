import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { storeCreatorAvatar } from "@/lib/avatar-store";
import { db } from "@/lib/db";
import { accounts, creatorPastProjects, creators } from "@/lib/db/schema";

import { profileEditSchema, type ProfileEdit } from "./options";

// Profile v2 writes — DECISIONS.md § 2026-10-04 "Onboarding from X and profile v2".

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Writes every editable field and replaces the past-projects list. */
export async function saveProfileFields(tx: Tx, creatorId: string, edit: ProfileEdit): Promise<void> {
  await tx
    .update(creators)
    .set({
      bio: edit.tagline || null,
      about: edit.about || null,
      location: edit.location || null,
      locationHidden: edit.locationHidden,
      projectName: edit.projectName || null,
      projectTagline: edit.projectTagline || null,
      ...(edit.projectUrl ? { workUrl: edit.projectUrl } : {}),
      workHow: edit.workHow ?? null,
      workStage: edit.workStage ?? null,
      workCareer: edit.workCareer ?? null,
      wantsToMeet: edit.wantsToMeet,
      openTo: edit.openTo,
      into: edit.into,
    })
    .where(eq(creators.id, creatorId));
  await tx.delete(creatorPastProjects).where(eq(creatorPastProjects.creatorId, creatorId));
  if (edit.past.length) {
    await tx.insert(creatorPastProjects).values(
      edit.past.map((p, i) => ({ creatorId, name: p.name, line: p.line || null, url: p.url || null, year: p.year, status: p.status, position: i })),
    );
  }
}

/** Owner-only edit; the caller has already checked the account owns `creatorId`. */
export async function updateCreatorProfile(creatorId: string, edit: ProfileEdit): Promise<void> {
  await db.transaction((tx) => saveProfileFields(tx, creatorId, edit));
}

export type Payment = { entryFeeCents: number; dodoPaymentId: string };

/**
 * What a $3 Enter the Arena payment does for an account (DECISIONS.md §
 * 2026-10-05 "Onboarding v2"): switch on its free profile, create its creator
 * (paid before finishing onboarding), or nothing (already in the Arena).
 */
export function arenaEntryAction(owned: { profileOnly: boolean } | null): "activate" | "create" | "none" {
  if (!owned) return "create";
  return owned.profileOnly ? "activate" : "none";
}

/**
 * Create the account's creator from its saved draft (server-side truth —
 * never from payment metadata), link it, and finish onboarding.
 * - No payment: "Finish profile" — a free, profile-only creator, never paired
 *   or ranked (`is_active = false`, `profile_only = true`).
 * - With a payment: straight into the Arena.
 * Idempotent on accounts.creator_id and dodo_payment_id.
 */
export async function createCreatorForAccount(accountId: string, edit: ProfileEdit | null, payment?: Payment): Promise<{ username: string } | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return null;
  if (account.creatorId) return null;

  const fields = edit ?? profileEditSchema.parse(account.draft ?? {});
  // The @handle is the username; if an older, unrelated row already holds it,
  // add a short suffix rather than fail.
  let username = account.xUsername.toLowerCase();
  const [taken] = await db.select({ id: creators.id }).from(creators).where(sql`lower(${creators.username}) = ${username}`);
  if (taken) username = `${username}_${accountId.slice(0, 4)}`;

  const xLink = `https://x.com/${account.xUsername}`;
  const { url: avatarUrl } = await storeCreatorAvatar(xLink, username);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(creators)
      .values({
        username,
        name: account.xName || account.xUsername,
        avatarUrl,
        bio: fields.tagline || null,
        category: "Builder",
        workUrl: fields.projectUrl || xLink,
        socials: { twitter: xLink },
        primarySocial: "twitter",
        entryFeeCents: payment?.entryFeeCents ?? null,
        dodoPaymentId: payment?.dodoPaymentId ?? null,
        isActive: !!payment,
        profileOnly: !payment,
        userId: accountId,
        xUserId: account.xUserId,
      })
      .onConflictDoNothing()
      .returning({ id: creators.id, username: creators.username });
    if (!row) return null;
    await saveProfileFields(tx, row.id, fields);
    await tx.update(accounts).set({ creatorId: row.id, draft: fields, onboardedAt: account.onboardedAt ?? new Date() }).where(eq(accounts.id, accountId));
    return { username: row.username };
  });
}

/** The $3 Enter the Arena payment for an account succeeded (webhook). */
export async function enterArenaForAccount(accountId: string, payment: Payment): Promise<void> {
  const [account] = await db.select({ creatorId: accounts.creatorId }).from(accounts).where(eq(accounts.id, accountId));
  if (!account) return;
  const [owned] = account.creatorId
    ? await db.select({ profileOnly: creators.profileOnly }).from(creators).where(eq(creators.id, account.creatorId))
    : [];
  const action = arenaEntryAction(owned ?? null);
  if (action === "create") await createCreatorForAccount(accountId, null, payment);
  if (action === "activate" && account.creatorId) {
    await db
      .update(creators)
      .set({ isActive: true, profileOnly: false, entryFeeCents: payment.entryFeeCents, dodoPaymentId: payment.dodoPaymentId })
      .where(and(eq(creators.id, account.creatorId), eq(creators.profileOnly, true)));
  }
}
