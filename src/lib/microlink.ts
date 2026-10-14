// Microlink's request and answer for a homepage screenshot — pure, so it is
// tested without the network. Used by src/lib/screenshot.ts.

/** The Microlink request for one page: 1200×628 (the card's 1.91:1) JPEG at 1×. */
export function microlinkRequest(href: string, apiKey?: string): { url: string; headers: Record<string, string> } {
  const q = new URLSearchParams({
    url: href,
    screenshot: "true",
    meta: "false",
    "viewport.width": "1200",
    "viewport.height": "628",
    "viewport.deviceScaleFactor": "1",
    "screenshot.type": "jpeg",
  });
  return apiKey
    ? { url: `https://pro.microlink.io/?${q}`, headers: { "x-api-key": apiKey } }
    : { url: `https://api.microlink.io/?${q}`, headers: {} };
}

/** The screenshot URL in Microlink's answer, or null (failed, limit reached, odd shape). */
export function screenshotFromResponse(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { status?: unknown; data?: { screenshot?: { url?: unknown } } };
  const url = b.status === "success" ? b.data?.screenshot?.url : null;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}
