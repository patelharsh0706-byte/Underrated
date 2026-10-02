// Which demo videos in Blob are safe to delete — DECISIONS.md § 2026-10-01
// "Unpaid demo videos are deleted daily". Pure, so the rule is testable
// without Blob or the database; the cron route does the listing and deleting.

/** A video can still be paid for from an open checkout for this long. */
export const CLEANUP_GRACE_MS = 48 * 60 * 60 * 1000;

/** Hand-added beta demos live here; the cleanup never touches it. */
export const PROTECTED_PREFIX = "demos/beta/";

export interface StoredVideo {
  url: string;
  pathname: string;
  uploadedAt: Date;
}

/** Store path of a Blob URL ("demos/x.mp4"), so URL quirks can't break the match. */
function pathOf(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

/**
 * The videos no demo row uses, older than the grace period, outside
 * demos/beta/. A row only exists once a payment succeeded (or the operator
 * added it), so "unreferenced" means "never paid for".
 */
export function videosToDelete(videos: StoredVideo[], referencedUrls: Iterable<string>, now: Date): StoredVideo[] {
  const referenced = new Set<string>();
  for (const url of referencedUrls) {
    const path = pathOf(url);
    if (path) referenced.add(path);
  }
  return videos.filter(
    (v) =>
      v.pathname.startsWith("demos/") &&
      !v.pathname.startsWith(PROTECTED_PREFIX) &&
      !referenced.has(v.pathname) &&
      now.getTime() - v.uploadedAt.getTime() > CLEANUP_GRACE_MS,
  );
}
