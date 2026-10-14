import "server-only";

// A homepage screenshot from Microlink, for a pasted project with no share
// picture (DECISIONS.md § 2026-10-14 "Homepage screenshot fallback";
// ARCHITECTURE.md § Project pictures and logos on profiles). Returns the
// screenshot's address on Microlink's CDN — the caller copies it into Blob.

import { microlinkRequest, screenshotFromResponse } from "./microlink";

const TIMEOUT_MS = 12_000;

/** Never throws. Null when Microlink can't take it (blocked site, timeout, daily limit). */
export async function takeScreenshot(href: string): Promise<string | null> {
  try {
    const req = microlinkRequest(href, process.env.MICROLINK_API_KEY || undefined);
    const res = await fetch(req.url, { headers: req.headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return screenshotFromResponse(await res.json());
  } catch {
    return null;
  }
}
