import "server-only";

import { headers } from "next/headers";

/**
 * The origin that actually served this request — e.g. "https://underhyped.wtf".
 *
 * Deliberately not `NEXT_PUBLIC_APP_URL`. That env var went stale across the
 * underrated.lol -> underhyped.wtf move and, being required by clientEnv()'s
 * schema, took the profile page down in production the moment it was wrong.
 * The Host header always matches the domain the visitor is actually on, which
 * is also the only domain a checkout return can safely send them back to.
 *
 * `x-forwarded-proto` is what Vercel terminates TLS behind; it arrives as a
 * comma-separated list when more than one proxy is in front of us, and the
 * first entry is the one the client spoke.
 */
export async function getAppOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwarded || (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
