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
 * Get the current user ID from JWT claims (Supabase Auth).
 * Returns null if not authenticated.
 *
 * Note: getClaims() is a network call on symmetric-JWT projects.
 * Never call this in ISR paths (profile pages must stay cookie-free).
 */
export async function getUserId(): Promise<string | null> {
  try {
    const client = await createClient();
    const { data } = await client.auth.getClaims();
    return data?.claims?.sub ?? null;
  } catch {
    return null;
  }
}
