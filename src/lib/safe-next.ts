// Where to send someone after sign-in or onboarding: a path on this site, or
// the fallback. Shared by /auth/callback, /welcome and "⚡ You're in." so the
// rule lives once. No server imports — the client uses it too.

const BASE = "https://underhyped.invalid";

/**
 * Rejects anything a browser could read as another site: `//evil.com`,
 * `/\evil.com` (browsers treat `\` like `/`), full URLs, and control
 * characters (a tab or newline inside `//` is ignored by browsers too).
 */
export function safeNext(raw: string | null | undefined, fallback = "/arena"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
