"use server";

import { lookup } from "node:dns/promises";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getSignedInUserId, PREVIEW_PROFILE_DONE_COOKIE } from "@/lib/account";
import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { accounts, creators } from "@/lib/db/schema";
import { getDodoClient } from "@/lib/dodo-payments";
import { getAppOrigin } from "@/lib/app-url";
import { dodoEnv } from "@/lib/env";
import { withProject } from "@/lib/profile/draft";
import { profileEditSchema, type ProfileEdit } from "@/lib/profile/options";
import { PREVIEW_DRAFT_COOKIE } from "@/lib/profile/preview-me";
import { isPrivateHost, parseProjectMeta } from "@/lib/profile/project-meta";
import { createCreatorForAccount, updateCreatorProfile } from "@/lib/profile/write";
import { getUnavatarUrl } from "@/lib/unavatar";

// Onboarding v2 — Welcome → Looking good? → You → Interests → History →
// "⚡ You're in." (DECISIONS.md § 2026-10-05 "Onboarding v2"). The draft lives
// on the account, server-side; "Finish profile" turns it into a free profile.
// PREVIEW_MOCK=1 keeps the draft in a short-lived private cookie instead.

async function myAccount() {
  const userId = await getSignedInUserId();
  if (!userId) return null;
  const [row] = await db.select().from(accounts).where(eq(accounts.id, userId));
  return row ?? null;
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
  const current = profileEditSchema.parse(account.draft ?? {});
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

const MAX_BYTES = 300_000;

/** Fetch one https page from a public host only, following at most 3 redirects. */
async function fetchPublicPage(start: string): Promise<{ html: string; url: string } | null> {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" || isPrivateHost(url.hostname)) return null;
    const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some((a) => isPrivateHost(a.address))) return null;
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": "UnderhypedBot/1.0 (+https://underhyped.wtf)", accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return null;
      url = new URL(next, url);
      continue;
    }
    if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    return { html: new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES)), url: url.toString() };
  }
  return null;
}

/**
 * "+ Add a past project" — logo, name and one-liner from the project's page.
 * Best effort: anything that fails just leaves the fields for the person to type.
 */
export async function fetchProjectMeta(input: { url: string }): Promise<ProjectMetaResult | { error: string }> {
  const raw = z.string().trim().min(3).max(300).safeParse(input.url);
  if (!raw.success) return { error: "Paste the project’s link, like yourproduct.com." };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.data) ? raw.data.replace(/^http:/i, "https:") : `https://${raw.data}`);
  } catch {
    return { error: "That link looks off — check for a typo." };
  }
  if (!url.hostname.includes(".") || isPrivateHost(url.hostname)) return { error: "That link looks off — check for a typo." };
  const href = url.toString();
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
export async function startArenaCheckout(): Promise<{ error?: string; payUrl?: string }> {
  if (isMockMode()) return { error: "Preview — no checkout. Entering the Arena costs $3 on the live site." };
  const account = await myAccount();
  if (!account) return { error: "Sign in with X first." };
  // No paying before the profile is finished — DECISIONS.md § 2026-10-06.
  if (!account.creatorId) return { error: "Finish your profile first." };
  const [owned] = await db.select({ profileOnly: creators.profileOnly, username: creators.username }).from(creators).where(eq(creators.id, account.creatorId));
  if (!owned) return { error: "Finish your profile first." };
  if (!owned.profileOnly) return { error: "You’re already in the Arena." };
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
