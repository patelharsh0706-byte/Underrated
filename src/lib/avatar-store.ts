import "server-only";

import { put } from "@vercel/blob";

import { dicebearUrl, resolveSponsorProfile } from "@/lib/unavatar";

// Fetch a creator's photo once, keep our own copy in the public Blob store,
// serve every view from there. See ARCHITECTURE.md § Creator avatars.

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 2 * 1024 * 1024;

// PNG and JPEG only: the OG card renders avatars with Satori, which can't be
// trusted with other formats. Anything else falls back rather than risk a
// broken share image.
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type AvatarResult =
  | { url: string; stored: true }
  | { url: string; stored: false; reason: string; rateLimited: boolean };

/**
 * Never throws. A paid signup must not fail over an avatar, so every failure
 * — no photo, unavatar refusing (429), a timeout, an odd format, an upload
 * error — returns the Dicebear PNG with the reason attached.
 */
export async function storeCreatorAvatar(
  primaryLink: string | null,
  username: string,
): Promise<AvatarResult> {
  const fallback = (reason: string, rateLimited = false): AvatarResult => ({
    url: dicebearUrl(username),
    stored: false,
    reason,
    rateLimited,
  });

  // Already `?fallback=false`, so "no photo" is a 404 rather than an image.
  const source = primaryLink ? resolveSponsorProfile(primaryLink)?.imageUrl : null;
  if (!source) return fallback("no resolvable social link");

  try {
    const res = await fetch(source, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 429) return fallback("unavatar rate limit reached", true);
    if (!res.ok) return fallback(`unavatar returned ${res.status}`);

    const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const extension = EXTENSION[contentType];
    if (!extension) return fallback(`unsupported image type "${contentType}"`);

    const body = await res.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
      return fallback(`image size ${body.byteLength} bytes out of range`);
    }

    // Random suffix: a refreshed photo gets a new URL, so the CDN can't keep
    // serving the old one.
    const blob = await put(`avatars/${username}.${extension}`, body, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return { url: blob.url, stored: true };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "unknown error");
  }
}
