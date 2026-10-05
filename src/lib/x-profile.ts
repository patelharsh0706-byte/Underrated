// What an X profile says someone is shipping — the prefill for Welcome's
// "What are you building?" (DECISIONS.md § 2026-10-04 "Onboarding from X and
// profile v2"). Pure, so it's tested without calling X.

interface XUrlEntity {
  expanded_url?: string;
  url?: string;
}

export interface XProfileData {
  description?: string;
  url?: string;
  entities?: {
    url?: { urls?: XUrlEntity[] };
    description?: { urls?: XUrlEntity[] };
  };
}

const NOT_A_PROJECT = /^(?:www\.)?(?:x\.com|twitter\.com|t\.co|mobile\.twitter\.com)$/i;

function cleanLink(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (NOT_A_PROJECT.test(u.hostname) || !u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// "building underhyped.wtf" → underhyped.wtf. Requires a letter in the TLD so
// "v2.0" or "3.5k" never match.
const BARE_DOMAIN = /\b((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?)/gi;

/**
 * 1. The profile's Website field.
 * 2. Else the first link X marks inside the bio (entities.description.urls).
 * 3. Else the first bare domain written in the bio text.
 * Links back to X itself are never a project.
 */
export function shippingUrlFrom(d: XProfileData): string | null {
  const website = cleanLink(d.entities?.url?.urls?.[0]?.expanded_url) ?? cleanLink(d.url);
  if (website) return website;
  for (const u of d.entities?.description?.urls ?? []) {
    const link = cleanLink(u.expanded_url ?? u.url);
    if (link) return link;
  }
  for (const m of (d.description ?? "").matchAll(BARE_DOMAIN)) {
    const link = cleanLink(m[1]);
    if (link) return link;
  }
  return null;
}
