// Profile link chips, edited in place by the owner (DECISIONS.md § 2026-10-13
// "Profile projects as cards", link chips). X is locked to the sign-in.
// GitHub is "github.com/" + a username; every other link is pasted whole and
// must belong to that chip's site (Website takes any public site). Checked by
// format and host only — no network visit. Stored in creators.socials.

import { isPrivateHost } from "./project-meta";

export const EDITABLE_LINKS = ["github", "linkedin", "web", "instagram", "youtube", "tiktok", "producthunt"] as const;
export type EditableLink = (typeof EDITABLE_LINKS)[number];

/** Always shown to the owner; the rest come from "+ Add another". */
export const ALWAYS_SHOWN: readonly EditableLink[] = ["github", "linkedin"];
export const ADD_ANOTHER: readonly EditableLink[] = ["web", "instagram", "youtube", "tiktok", "producthunt"];

export const LINK_NAME: Record<EditableLink, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  web: "Website",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  producthunt: "Product Hunt",
};

const SITE_HOSTS: Partial<Record<EditableLink, string[]>> = {
  github: ["github.com"],
  linkedin: ["linkedin.com"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
  producthunt: ["producthunt.com"],
};

export type LinkResult = { url: string } | { error: string };

/** "harsh", "@harsh" or a pasted github.com/harsh link → the GitHub username; null if invalid. */
export function githubUser(raw: string): string | null {
  let t = raw.trim();
  if (!t) return "";
  const m = t.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  if (m) t = m[1];
  t = t.replace(/^@/, "");
  // GitHub's own rule: letters, numbers and single hyphens, ≤ 39.
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(t) ? t : null;
}

/** What the owner typed in a chip → the link to store ("" clears it), or a short note. */
export function cleanLink(kind: EditableLink, raw: string): LinkResult {
  const name = LINK_NAME[kind];
  if (kind === "github") {
    const user = githubUser(raw);
    if (user === null) return { error: "GitHub: just the username — letters, numbers and -" };
    return { url: user ? `https://github.com/${user}` : "" };
  }
  let t = raw.trim();
  if (!t) return { url: "" };
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { error: `${name}: that doesn’t look like a link — paste the whole address.` };
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (/\s/.test(t) || !host.includes(".") || isPrivateHost(host) || u.username || u.password) {
    return { error: `${name}: that doesn’t look like a link — paste the whole address.` };
  }
  const ok = SITE_HOSTS[kind];
  if (ok && !ok.some((h) => host === h || host.endsWith(`.${h}`))) return { error: `That isn’t a ${name} link — paste one from ${ok[0]}.` };
  if (ok && u.pathname.replace(/\//g, "") === "") return { error: `Paste your own ${name} page, not just ${ok[0]}.` };
  const url = `https://${host}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  return url.length > 300 ? { error: `${name}: that link is too long.` } : { url };
}

/** A stored link as the chip shows it: "linkedin.com/in/harsh". */
export function shortLink(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

/** The GitHub username in a stored link ("" if none). */
export function githubFromLink(url: string | undefined): string {
  return url ? (githubUser(url) ?? "") : "";
}
