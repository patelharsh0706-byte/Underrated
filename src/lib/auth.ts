import "server-only";

import { createClient } from "./supabase/server";

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
  } catch (error) {
    // getClaims may fail if auth is not initialized or token is invalid
    return null;
  }
}
