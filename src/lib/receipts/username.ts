/** Reserved top-level paths. `/[username]/receipts` is a root dynamic segment,
 * so a username that collides with a real route would be shadowed by it —
 * harmless for routing (Next matches static segments first) but confusing, and
 * it would let someone claim a handle that can never resolve. Blocked at the
 * write path, the same way creator categories are (see creator-schema.ts). */
export const RESERVED_USERNAMES = new Set([
  "c",
  "about",
  "rules",
  "leaderboard",
  "receipts",
  "submit",
  "sponsor",
  "sign-in",
  "auth",
  "api",
  "_next",
  "admin",
  "underhyped",
  "arena",
  "spot",
  "spots",
]);

const MAX_LENGTH = 20;

/**
 * Turn a Google email into a usable handle.
 *
 * Only the local part is used, lowercased, with anything that is not a letter,
 * digit, underscore or hyphen collapsed to a hyphen. Gmail dots and `+tags` are
 * not meaningful in an address, so they go too.
 *
 * Returns a *candidate*. It may collide with an existing handle or be reserved —
 * `resolveUsername` walks the suffixes.
 */
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const base = local
    .split("+")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, MAX_LENGTH);

  // An address made entirely of punctuation leaves nothing to work with.
  return base.length >= 2 ? base : "picker";
}

/**
 * First free handle in the series `base`, `base-2`, `base-3`, …
 *
 * `isTaken` is injected so this stays a pure function under test — the caller
 * supplies the database lookup.
 */
export async function resolveUsername(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  for (let n = 1; n <= maxAttempts; n += 1) {
    const candidate = n === 1 ? base : `${base.slice(0, MAX_LENGTH - 3)}-${n}`;
    if (RESERVED_USERNAMES.has(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }

  // Exhausting 50 variants of one base means something is very wrong with the
  // base itself; fall back to something that cannot collide.
  return `picker-${Date.now().toString(36)}`;
}
