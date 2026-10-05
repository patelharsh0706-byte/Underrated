// The vote someone attempted before signing in (or before finishing their free
// profile), kept across the X sign-in and onboarding round trip so it is
// replayed on return and they never pick twice (DECISIONS.md § 2026-10-04,
// § 2026-10-05). Browser-only, per tab, short-lived.

import type { PublicCreator } from "@/lib/db/queries";

const KEY = "uh-pending-action";
// Long enough for X sign-in plus the five onboarding steps.
export const PENDING_TTL_MS = 30 * 60 * 1000;

export type PendingAction =
  | { type: "pick"; pair: [PublicCreator, PublicCreator]; winnerId: string; loserId: string; at: number }
  | { type: "demo"; demoId: string; underhyped: boolean; at: number }
  | { type: "hype"; creatorId: string; at: number };

type NewPending = PendingAction extends infer A ? (A extends { at: number } ? Omit<A, "at"> : never) : never;

export function savePending(action: NewPending, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...action, at: now }));
  } catch {
    // Storage blocked (private mode): they just pick again after signing in.
  }
}

/** Reads and clears the pending action; null if missing, stale or malformed. */
export function takePending(type: PendingAction["type"], now = Date.now()): PendingAction | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  return parsePending(raw, type, now);
}

export function parsePending(raw: string | null, type: PendingAction["type"], now = Date.now()): PendingAction | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PendingAction;
    if (v.type !== type || typeof v.at !== "number" || now - v.at > PENDING_TTL_MS) return null;
    if (v.type === "pick" && (!Array.isArray(v.pair) || v.pair.length !== 2 || !v.winnerId || !v.loserId)) return null;
    if (v.type === "demo" && (!v.demoId || typeof v.underhyped !== "boolean")) return null;
    if (v.type === "hype" && !v.creatorId) return null;
    return v;
  } catch {
    return null;
  }
}

/** The current path with ?resume=1, used as the sign-in return address. */
export function resumeHere(): string {
  const url = new URL(window.location.href);
  url.searchParams.set("resume", "1");
  return url.pathname + url.search;
}

/** True once per return from sign-in; strips ?resume=1 so a refresh can't replay. */
export function consumeResumeFlag(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("resume") !== "1") return false;
  url.searchParams.delete("resume");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  return true;
}

/** Onboarding, returning here afterwards to replay the pending vote. */
export function onboardingHref(): string {
  return `/welcome?next=${encodeURIComponent(resumeHere())}`;
}

/** Which kind of vote is waiting (without taking it) — for "Your pick now counts." */
export function peekPendingType(now = Date.now()): PendingAction["type"] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as PendingAction) : null;
    return v && typeof v.at === "number" && now - v.at <= PENDING_TTL_MS ? v.type : null;
  } catch {
    return null;
  }
}
