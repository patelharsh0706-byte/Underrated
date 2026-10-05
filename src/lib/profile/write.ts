import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { loadAccount } from "@/lib/account";
import { storeCreatorAvatar } from "@/lib/avatar-store";
import { db } from "@/lib/db";
import { accounts, creatorPastProjects, creators } from "@/lib/db/schema";
import { uniqueViolation } from "@/lib/db/unique-violation";

import { draftForAccount } from "./draft";
import { type ProfileEdit } from "./options";

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
      // Always written, so clearing the project really clears it.
      workUrl: edit.projectUrl || null,
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
 * Idempotent: the account owns at most one creator (same X user id, unique)
 * and a payment makes at most one (unique dodo_payment_id).
 */
export async function createCreatorForAccount(accountId: string, edit: ProfileEdit | null, payment?: Payment): Promise<{ username: string } | null> {
  const account = await loadAccount(accountId);
  if (!account) return null;
  // Already owns a creator — the one with its X user id (DATABASE.md § accounts).
  if (account.creatorId) return null;

  // The saved draft, or the X prefill when nothing is saved yet (never `{}`).
  const fields = edit ?? draftForAccount(account);

  // The webhook ran twice for this payment: the creator already exists.
  if (payment) {
    const [paid] = await db.select({ username: creators.username }).from(creators).where(eq(creators.dodoPaymentId, payment.dodoPaymentId));
    if (paid) return paid;
  }

  // The @handle is the username. If an older, unrelated row holds it (any
  // case), or another sign-up takes it between this check and the insert,
  // fall back to a short suffix.
  const base = account.xUsername.toLowerCase();
  const [taken] = await db.select({ id: creators.id }).from(creators).where(sql`lower(${creators.username}) = ${base}`);
  const spellings = [base, `${base}_${accountId.slice(0, 4)}`, `${base}_${accountId.slice(0, 8)}`].slice(taken ? 1 : 0);

  const xLink = `https://x.com/${account.xUsername}`;
  const { url: avatarUrl } = await storeCreatorAvatar(xLink, spellings[0]);

  for (const username of spellings) {
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(creators)
          .values({
            username,
            name: account.xName || account.xUsername,
            avatarUrl,
            bio: fields.tagline || null,
            category: "Builder",
            // No project means no project — never the X profile (it showed as
            // "Currently cooking: x.com").
            workUrl: fields.projectUrl || null,
            socials: { twitter: xLink },
            primarySocial: "twitter",
            entryFeeCents: payment?.entryFeeCents ?? null,
            dodoPaymentId: payment?.dodoPaymentId ?? null,
            isActive: !!payment,
            profileOnly: !payment,
            // The X user id is the link to the account (DATABASE.md § accounts).
            xUserId: account.xUserId,
          })
          .returning({ id: creators.id, username: creators.username });
        await saveProfileFields(tx, row.id, fields);
        await tx.update(accounts).set({ draft: fields, onboardedAt: account.onboardedAt ?? new Date() }).where(eq(accounts.id, accountId));
        return { username: row.username };
      });
    } catch (err) {
      // Username taken in the meantime: the next spelling. Any other clash is
      // a real problem — thrown, so finishProfile and the webhook log it.
      if (uniqueViolation(err) === "creators_username_key") continue;
      // A second Finish (two tabs) made this X person's creator first: it's theirs.
      if (uniqueViolation(err) === "creators_x_user_id_key") {
        const [made] = await db.select({ username: creators.username }).from(creators).where(eq(creators.xUserId, account.xUserId));
        if (made) return made;
      }
      throw err;
    }
  }
  throw new Error(`createCreatorForAccount: no free username for @${account.xUsername}`);
}

/** The $3 Enter the Arena payment for an account succeeded (webhook). */
export async function enterArenaForAccount(accountId: string, payment: Payment): Promise<void> {
  const account = await loadAccount(accountId);
  if (!account) return;
  const [owned] = account.creatorId
    ? await db.select({ profileOnly: creators.profileOnly }).from(creators).where(eq(creators.id, account.creatorId))
    : [];
  const action = arenaEntryAction(owned ?? null);
  if (action === "create") {
    const made = await createCreatorForAccount(accountId, null, payment);
    // Null only when the account vanished or got a creator meanwhile — log it
    // with the payment, so it's never a silent $3 with no profile.
    if (!made) console.error("enterArenaForAccount: no creator made", payment.dodoPaymentId, accountId);
  }
  if (action === "activate" && account.creatorId) {
    await db
      .update(creators)
      .set({ isActive: true, profileOnly: false, entryFeeCents: payment.entryFeeCents, dodoPaymentId: payment.dodoPaymentId })
      .where(and(eq(creators.id, account.creatorId), eq(creators.profileOnly, true)));
  }
}
