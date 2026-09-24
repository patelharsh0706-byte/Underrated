/**
 * Derives a logo/avatar and a suggested identity from whatever link a
 * sponsor pastes — their website or a social profile. Pure string
 * construction, no network call: the actual image request happens
 * client-side, in the visitor's browser, against unavatar.io — see
 * ARCHITECTURE.md § Sponsor logo resolution for why that keeps us clear of
 * its anonymous-tier rate limit.
 */

interface SocialPlatform {
  hosts: string[];
  slug: string;
  displayName: string;
  normalizeHandle: (handle: string) => string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { hosts: ["twitter.com", "x.com"], slug: "x", displayName: "X", normalizeHandle: (h) => h },
  {
    hosts: ["instagram.com"],
    slug: "instagram",
    displayName: "Instagram",
    normalizeHandle: (h) => h,
  },
  { hosts: ["github.com"], slug: "github", displayName: "GitHub", normalizeHandle: (h) => h },
  {
    hosts: ["tiktok.com"],
    slug: "tiktok",
    displayName: "TikTok",
    normalizeHandle: (h) => h.replace(/^@/, ""),
  },
  {
    hosts: ["youtube.com"],
    slug: "youtube",
    displayName: "YouTube",
    normalizeHandle: (h) => h.replace(/^@/, ""),
  },
];

function firstPathSegment(pathname: string): string | null {
  return pathname.split("/").filter(Boolean)[0] ?? null;
}

/**
 * People paste all sorts of things, not just full URLs: a bare "@handle"
 * (assume X — the default @handle convention), or a domain typed without a
 * protocol ("stripe.com"). This normalizes all of those into something
 * `new URL()` can parse; a plain word with neither an "@" nor a dot is left
 * alone and correctly fails to resolve.
 */
function normalizeInput(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("@")) {
    try {
      return new URL(`https://x.com/${trimmed.slice(1)}`);
    } catch {
      return null;
    }
  }

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

export interface ResolvedSponsorProfile {
  imageUrl: string;
  /** e.g. "X Profile · x.com/loyal" or "Website · stripe.com" */
  sourceLabel: string;
  /** "@loyal" for a recognized social profile, "" for a plain website — we
   *  can't reliably guess a display name from a bare domain. */
  suggestedName: string;
  /** "@loyal on X", "" for a plain website. */
  suggestedDescription: string;
  /** Handle normalized to the creator username charset (^[a-z0-9_.]+$), so an
   *  auto-filled username is valid by construction. "" for a plain website. */
  suggestedUsername: string;
  /** Key into the creator schema's social map ("twitter", "github", …), so the
   *  pasted link can seed the socials section. Null for a plain website. */
  socialKey: string | null;
}

/** unavatar's slug for X is "x"; the creator/sponsor social maps call it "twitter". */
const SOCIAL_KEY_BY_SLUG: Record<string, string> = {
  x: "twitter",
  instagram: "instagram",
  github: "github",
  tiktok: "tiktok",
  youtube: "youtube",
};

/** Coerce a social handle into the username charset the schema allows. */
export function toUsernameSlug(handle: string): string {
  return handle
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_.]/g, "");
}

export function resolveSponsorProfile(targetUrl: string): ResolvedSponsorProfile | null {
  const url = normalizeInput(targetUrl);
  if (!url) return null; // not resolvable yet — lets callers gate the live preview

  const hostname = url.hostname.replace(/^www\./, "");
  const platform = SOCIAL_PLATFORMS.find((p) => p.hosts.includes(hostname));

  if (platform) {
    const rawHandle = firstPathSegment(url.pathname);
    if (rawHandle) {
      const handle = platform.normalizeHandle(rawHandle);
      return {
        imageUrl: `https://unavatar.io/${platform.slug}/${encodeURIComponent(handle)}?fallback=false`,
        sourceLabel: `${platform.displayName} Profile · ${hostname}/${handle}`,
        suggestedName: `@${handle}`,
        suggestedDescription: `@${handle} on ${platform.displayName}`,
        suggestedUsername: toUsernameSlug(handle),
        socialKey: SOCIAL_KEY_BY_SLUG[platform.slug] ?? null,
      };
    }
  }

  return {
    imageUrl: `https://unavatar.io/domain/${encodeURIComponent(hostname)}?fallback=false`,
    sourceLabel: `Website · ${hostname}`,
    suggestedName: "",
    suggestedDescription: "",
    suggestedUsername: "",
    socialKey: null,
  };
}

/**
 * Dicebear PNG (not SVG) — Satori can't rasterize SVG, so the OG image would
 * break on an SVG avatar. See ogAvatarSrc in c/[username]/opengraph-image.tsx.
 */
export function dicebearUrl(username: string): string {
  return `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(username)}`;
}

/**
 * A creator's stored avatar: their real profile picture when the link resolves
 * one, otherwise a generated Dicebear illustration.
 *
 * The Dicebear URL is handed to unavatar as its own `fallback` param rather
 * than being swapped in client-side, so this single stored URL always renders
 * something — no onError handling needed on the battle card, leaderboard,
 * profile, or OG image.
 */
export function getCreatorAvatarUrl(primaryLink: string | null, username: string): string {
  const fallback = dicebearUrl(username);
  if (!primaryLink) return fallback;

  const resolved = resolveSponsorProfile(primaryLink);
  if (!resolved) return fallback;

  return `${resolved.imageUrl.replace("?fallback=false", "")}?fallback=${encodeURIComponent(fallback)}`;
}

/** Just the image URL — used wherever only the logo matters. */
export function getUnavatarUrl(targetUrl: string): string | null {
  return resolveSponsorProfile(targetUrl)?.imageUrl ?? null;
}

/**
 * The actual absolute URL to store/submit — e.g. "@loyal" normalizes to
 * "https://x.com/loyal". Submitting the raw text as-is would fail strict URL
 * validation even though the preview resolved it just fine.
 */
export function normalizeToUrlString(raw: string): string | null {
  return normalizeInput(raw)?.toString() ?? null;
}
