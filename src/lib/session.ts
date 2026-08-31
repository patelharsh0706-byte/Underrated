import "server-only";

import { cookies } from "next/headers";

const VOTER_SESSION_COOKIE = "underrated_voter";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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
