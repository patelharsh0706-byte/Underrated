"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getSignedInUserId, loadAccount, PREVIEW_PROFILE_DONE_COOKIE } from "@/lib/account";
import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { accounts, creators } from "@/lib/db/schema";
import { getDodoClient } from "@/lib/dodo-payments";
import { getAppOrigin } from "@/lib/app-url";
import { dodoEnv } from "@/lib/env";
import { domainOf, draftForAccount, withProject } from "@/lib/profile/draft";
import { profileEditSchema, type ProfileEdit } from "@/lib/profile/options";
import { PREVIEW_DRAFT_COOKIE } from "@/lib/profile/preview-me";
import { normalizeProjectLink, parseProjectMeta } from "@/lib/profile/project-meta";
import { createCreatorForAccount, updateCreatorProfile } from "@/lib/profile/write";
import { fetchPublicPage } from "@/lib/safe-fetch";
import { getUnavatarUrl } from "@/lib/unavatar";

// Onboarding v2 — Welcome → Looking good? → You → Interests → History →
// "⚡ You're in." (DECISIONS.md § 2026-10-05 "Onboarding v2"). The draft lives
// on the account, server-side; "Finish profile" turns it into a free profile.
// PREVIEW_MOCK=1 keeps the draft in a short-lived private cookie instead.

async function myAccount() {
  const userId = await getSignedInUserId();
  return userId ? loadAccount(userId) : null;
}

/** Welcome step A: private email + what you're building. */
export async function saveWelcome(input: { email: string; projectUrl: string }): Promise<{ error?: string; draft?: ProfileEdit }> {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().pipe(z.email({ error: "That email looks off — check for a typo." })),
      // Optional (DECISIONS.md § 2026-10-05): voting needs a profile, not a project.
      projectUrl: z.string().trim().max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (isMockMode()) return {};
  const account = await myAccount();
  if (!account) return { error: "Sign in with X first." };
  const current = draftForAccount(account);
  let next: ProfileEdit;
  try {
    next = withProject(current, parsed.data.projectUrl);
  } catch {
    return { error: "That link looks off — try something like yourproduct.com, or leave it empty." };
  }
  await db.update(accounts).set({ email: parsed.data.email, draft: next }).where(eq(accounts.id, account.id));
  return { draft: next };
}

async function setPreviewCookie(name: string, value: string) {
  (await cookies()).set(name, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
}

/** Each step's choices, saved as the person goes (debounced on the page). */
export async function saveDraft(input: unknown): Promise<{ error?: string }> {
  const parsed = profileEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (isMockMode()) {
    if (!(await getSignedInUserId())) return {};
    await setPreviewCookie(PREVIEW_DRAFT_COOKIE, JSON.stringify(parsed.data));
    return {};
  }
  const account = await myAccount();
  if (!account) return { error: "Sign in with X first." };
  await db.update(accounts).set({ draft: parsed.data }).where(eq(accounts.id, account.id));
  return {};
}

/**
 * "Finish profile →" — the free public profile now exists, so this account's
 * picks, demo judgements and Hype count from here on. A new person gets a
 * profile-only creator (not in the Arena); a claimed creator saves edits.
 */
export async function finishProfile(input: unknown): Promise<{ error?: string; username?: string }> {
  const parsed = profileEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (isMockMode()) {
    const userId = await getSignedInUserId();
    if (!userId) return { error: "Sign in with X first." };
    await setPreviewCookie(PREVIEW_DRAFT_COOKIE, JSON.stringify(parsed.data));
    await setPreviewCookie(PREVIEW_PROFILE_DONE_COOKIE, userId);
    return {};
  }
  const account = await myAccount();
  if (!account) return { error: "Sign in with X first." };
  try {
    if (account.creatorId) {
      await updateCreatorProfile(account.creatorId, parsed.data);
      await db.update(accounts).set({ draft: parsed.data, onboardedAt: account.onboardedAt ?? new Date() }).where(eq(accounts.id, account.id));
    } else {
      const made = await createCreatorForAccount(account.id, parsed.data);
      if (!made) return { error: "Couldn’t create your profile — try again." };
      revalidatePath(`/c/${made.username}`);
      return { username: made.username };
    }
    return {};
  } catch (error) {
    console.error("finishProfile failed", error);
    return { error: "Couldn’t save your profile — try again." };
  }
}

export interface ProjectMetaResult {
  url: string;
  name: string;
  description: string;
  logo: string | null;
}

/**
 * "+ Add a past project" — logo, name and one-liner from the project's page.
 * Best effort: anything that fails just leaves the fields for the person to type.
 */
export async function fetchProjectMeta(input: { url: string }): Promise<ProjectMetaResult | { error: string }> {
  // Signed-in only: it makes our server fetch a URL, so it isn't open to
  // anyone on the internet. Preview mode has its sample person signed out.
  if (!isMockMode() && !(await getSignedInUserId())) return { error: "Sign in with X first." };
  const raw = z.string().trim().min(3).max(300).safeParse(input.url);
  if (!raw.success) return { error: "Paste the project’s link, like yourproduct.com." };
  const href = normalizeProjectLink(raw.data);
  if (!href) return { error: "That link looks off — check for a typo." };
  const logo = getUnavatarUrl(href);
  try {
    const page = await fetchPublicPage(href);
    if (!page) return { url: href, logo, ...parseProjectMeta("", href) };
    return { url: href, logo, ...parseProjectMeta(page.html, page.url) };
  } catch {
    return { url: href, logo, ...parseProjectMeta("", href) };
  }
}

/**
 * "Enter the Arena →" — a $3 Dodo checkout for this account. Only the account
 * id travels as metadata; the webhook reads the draft from our database.
 */
export async function startArenaCheckout(input?: { projectUrl?: string }): Promise<{ error?: string; payUrl?: string }> {
  // From /submit's "What are you building?" (DECISIONS.md § 2026-10-06):
  // required there, checked like every profile link. The profile card sends none.
  let projectUrl: string | null = null;
  if (input?.projectUrl !== undefined) {
    const parsed = profileEditSchema.shape.projectUrl.safeParse(input.projectUrl);
    if (!parsed.success) return { error: "That link looks off — try something like yourproduct.com." };
    if (!parsed.data) return { error: "Add a link to something you’ve made." };
    projectUrl = parsed.data;
  }
  if (isMockMode()) return { error: "Preview — no checkout. Entering the Arena costs $3 on the live site." };
  const account = await myAccount();
  if (!account) return { error: "Sign in with X first." };
  // No paying before the profile is finished — DECISIONS.md § 2026-10-06.
  if (!account.creatorId) return { error: "Finish your profile first." };
  const [owned] = await db
    .select({ profileOnly: creators.profileOnly, username: creators.username, workUrl: creators.workUrl, projectName: creators.projectName })
    .from(creators)
    .where(eq(creators.id, account.creatorId));
  if (!owned) return { error: "Finish your profile first." };
  if (!owned.profileOnly) return { error: "You’re already in the Arena." };
  // A changed project link is saved to the profile before paying, so the
  // Arena card shows what they just typed. A name they chose themselves stays.
  if (projectUrl && projectUrl !== owned.workUrl) {
    const keepName = owned.projectName && owned.projectName !== domainOf(owned.workUrl ?? "");
    await db
      .update(creators)
      .set({ workUrl: projectUrl, projectName: keepName ? owned.projectName : domainOf(projectUrl).slice(0, 40) })
      .where(eq(creators.id, account.creatorId));
  }
  const back = `/c/${owned.username}`;
  try {
    // The domain that served this request, never NEXT_PUBLIC_APP_URL (ISSUES.md, lib/app-url.ts).
    const appUrl = await getAppOrigin();
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: dodoEnv().DODO_PAYMENTS_SUBMISSION_PRODUCT_ID, quantity: 1 }],
      customer: account.email ? { email: account.email } : null,
      return_url: `${appUrl}${back}?paid=1`,
      cancel_url: `${appUrl}${back}`,
      metadata: { account_id: account.id },
    });
    if (!session.checkout_url) throw new Error("Dodo Payments did not return a checkout URL");
    if (!account.onboardedAt) await db.update(accounts).set({ onboardedAt: new Date() }).where(eq(accounts.id, account.id));
    return { payUrl: session.checkout_url };
  } catch (error) {
    console.error("startArenaCheckout: couldn't start Dodo checkout", error);
    return { error: "Couldn’t start checkout — try again in a minute." };
  }
}
