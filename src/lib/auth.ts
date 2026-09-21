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
 * Uses getUser() rather than getClaims(): `createClient()` builds a fresh
 * client per call, so getClaims()'s JWKS cache never warms and every call
 * would re-fetch the key set anyway. getUser() is one direct call, the same
 * one proxy.ts and profile.ts already rely on. The catch logs rather than
 * swallowing — a signed-in user silently treated as signed-out is otherwise
 * invisible (ISSUES.md § 2026-09-21).
 *
 * Talks only to Supabase Auth, never the database — safe under PREVIEW_MOCK.
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
