// Demo upload rules — DECISIONS.md § 2026-09-30. Checked in the browser for
// instant feedback; Phase 2 re-checks type and size on the server (a browser
// check can be bypassed). Messages match the approved prototype.

export const MAX_DEMO_SECONDS = 15;
export const MAX_DEMO_BYTES = 8 * 1024 * 1024; // keeps Blob transfer in the free allowance
const DURATION_GRACE = 0.5; // encoders round; a 15.2 s export is still a 15 s demo

export function checkClipFile(file: { name: string; type: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (file.type === "video/quicktime" || name.endsWith(".mov")) {
    return "That’s a .mov (iPhone’s format) — many browsers can’t play it. Export as MP4 (H.264) or WebM.";
  }
  if (!(file.type === "video/mp4" || file.type === "video/webm" || /\.(mp4|webm)$/.test(name))) {
    return "That isn’t a video we can use — upload an MP4 or WebM screen recording.";
  }
  if (file.size > MAX_DEMO_BYTES) {
    return `That file is ${(file.size / 1048576).toFixed(1)} MB — keep it under 8 MB. Export at 720p; 15 seconds fits easily.`;
  }
  return null;
}

export function checkClipDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds)) return "Couldn’t read this video in the browser — try an MP4 (H.264) export.";
  if (seconds > MAX_DEMO_SECONDS + DURATION_GRACE) {
    return `That’s ${seconds.toFixed(1)} seconds — trim it to 15 seconds or less. Show the thing, fast.`;
  }
  return null;
}

/** Demos play in a 16:9 landscape frame at 1280×720 (DECISIONS.md § 2026-09-30). */
export const DEMO_WIDTH = 1280;
export const DEMO_HEIGHT = 720;

/**
 * A warning, not a rejection: any shape still plays (letterboxed), but a
 * non-16:9 demo shows black bars. Returns null for 16:9 at any resolution.
 */
export function checkClipShape(width: number, height: number): string | null {
  if (!(width > 0 && height > 0)) return null;
  if (Math.abs(width / height - 16 / 9) <= 0.02) return null;
  const shape = height > width ? "vertical" : Math.abs(width - height) <= 2 ? "square" : "not 16:9";
  return `Your video is ${width}×${height} (${shape}). Demos play in a 16:9 landscape frame, so it will show with black bars — re-render at 1280×720 for the best result.`;
}
