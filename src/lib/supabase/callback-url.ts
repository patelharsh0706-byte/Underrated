/**
 * The absolute URL Supabase redirects back to after Google OAuth — always
 * `/auth/callback` on the page's own origin, carrying where to land next.
 *
 * Every sign-in entry point builds its `redirectTo` here, from
 * `window.location.origin`, never from an env var. The prompt used to read
 * `NEXT_PUBLIC_SITE_URL`, which was unset on Vercel; Supabase rejected the
 * malformed URL against its allow-list and fell back to the dashboard Site
 * URL, so `/auth/callback` — the only place a profile row was created —
 * never ran. See ISSUES.md § 2026-09-21. The `/sign-in` page's button had
 * always used the origin and never had the bug; this is that pattern, shared.
 *
 * `next` must be an in-app absolute path: it starts with a single `/` and
 * nothing that a browser would treat as a new authority or scheme. Anything
 * else — protocol-relative `//evil.com`, an absolute URL, a backslash variant,
 * a bare word — becomes `fallback`. The fallback is a parameter because the
 * callers legitimately differ: receipts entry points land on `/receipts`, the
 * `/sign-in` page lands on `/submit`.
 *
 * The origin remains subject to Supabase Auth's redirect allow-list; an origin
 * that is not on it (an un-allow-listed preview host, say) falls back exactly
 * as before. That list is the one remaining gate — see the plan's U3
 * verification.
 */
export function buildCallbackUrl(
  origin: string,
  next: string | null | undefined,
  fallback: string,
): string {
  const path = isInAppPath(next) ? next : fallback;
  return `${origin.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent(path)}`;
}

function isInAppPath(value: string | null | undefined): value is string {
  if (!value || value[0] !== "/") return false;
  // A second slash or a backslash right after the first would let a browser
  // read the rest as a host.
  return value[1] !== "/" && value[1] !== "\\";
}
