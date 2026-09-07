import "server-only";

import { cookies } from "next/headers";

const VOTER_SESSION_COOKIE = "underhyped_voter";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Read-only variant, safe to call while rendering a page. `getOrCreate` sets a
 * cookie, which Next only permits in a Server Action or Route Handler — the
 * homepage needs the session to pick a pairing, so it reads without creating.
 * A visitor with no cookie yet simply has no battle history to alternate on.
 */
export async function readVoterSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VOTER_SESSION_COOKIE)?.value ?? null;
}

/** Anonymous voter identity used to attribute battles without an account. */
export async function getOrCreateVoterSession(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VOTER_SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  cookieStore.set(VOTER_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return id;
}
