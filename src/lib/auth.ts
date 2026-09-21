import "server-only";

import { cookies } from "next/headers";

import { createClient } from "./supabase/server";

/**
 * Whether this request could possibly be signed in, from cookies alone.
 *
 * Supabase stores its session as `sb-<project-ref>-auth-token`, chunked across
 * `.0`, `.1`… when large. A hit only means "maybe" — `getUserId` still
 * verifies — but a miss is conclusive, and a miss is the common case.
 *
 * Exists so surfaces rendered on every page can skip the auth check and the
 * profile lookup entirely for anonymous visitors. The homepage is already at
 * the edge of its query budget (ISSUES.md § 2026-09-12); nothing added to the
 * shell may cost an anonymous request anything.
 */
export async function hasAuthCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

/**
 * Get the current user ID (Supabase Auth). Returns null if not authenticated.
 *
 * Uses getUser() rather than getClaims(): getClaims() verifies the JWT
 * locally against the project's JWKS (`/.well-known/jwks.json`), caching that
 * key set on the client instance — but `createClient()` above builds a fresh
 * client on every call, so the cache never warms and every call re-fetches
 * the JWKS. A transient failure fetching it (this project has already hit
 * region/connectivity issues elsewhere, see ISSUES.md) is not always a typed
 * Supabase AuthError, so it can re-throw out of getClaims() entirely and
 * land in this function's catch — silently signing out a user whose session
 * was perfectly valid. getUser() makes one direct call to the Auth server
 * with no such dependency, and is what proxy.ts and profile.ts already use
 * successfully. See ISSUES.md § 2026-09-21 "Signed-in user asked to sign in
 * again on Spot".
 *
 * Never call this in ISR paths (profile pages must stay cookie-free).
 */
export async function getUserId(): Promise<string | null> {
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    return user?.id ?? null;
  } catch (error) {
    console.error("getUserId failed", error);
    return null;
  }
}
