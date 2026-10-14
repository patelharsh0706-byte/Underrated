import { domainOf } from "./draft";
import { LIMITS } from "./options";
import { normalizeProjectLink, splitLinks } from "./project-meta";

// The paste box's rules (DECISIONS.md § 2026-10-13, paste box): which pasted
// links get read, and a short note for each one that doesn't. Pure.

/** Same project = same host (without www.) and path. */
function sameKey(href: string): string {
  try {
    const u = new URL(href);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return href.toLowerCase();
  }
}

/** Which links to read, and notes for the rest. `existing`: links already on the profile; `count`: past projects there now. */
export function pickLinks(text: string, kind: "past" | "current", existing: string[], count: number): { links: string[]; notes: string[] } {
  const notes: string[] = [];
  const seen = new Set(existing.map(sameKey));
  const links: string[] = [];
  for (const raw of splitLinks(text)) {
    const href = normalizeProjectLink(raw);
    if (!href) {
      notes.push(`“${raw.slice(0, 40)}” doesn’t look like a link.`);
      continue;
    }
    if (seen.has(sameKey(href))) {
      notes.push(`${domainOf(href)} is already on your profile.`);
      continue;
    }
    seen.add(sameKey(href));
    links.push(href);
  }
  if (kind === "current" && links.length > 1) {
    notes.push("One link here — the first one was used.");
    return { links: links.slice(0, 1), notes };
  }
  const room = Math.max(0, LIMITS.past - count);
  if (links.length > room) {
    notes.push(room ? `Up to ${LIMITS.past} projects — ${links.length - room} not added.` : `You have ${LIMITS.past} projects already — remove one first.`);
    return { links: links.slice(0, room), notes };
  }
  return { links, notes };
}
