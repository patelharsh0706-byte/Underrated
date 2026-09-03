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
      };
    }
  }

  return {
    imageUrl: `https://unavatar.io/domain/${encodeURIComponent(hostname)}?fallback=false`,
    sourceLabel: `Website · ${hostname}`,
    suggestedName: "",
    suggestedDescription: "",
  };
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
