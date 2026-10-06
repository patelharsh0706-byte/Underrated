import { domainOf } from "@/lib/profile/draft";

// A creator's project as the site shows it — the profile's Cooking box and
// the leaderboard's Cooking column: a colour tile with the first letter, the
// project's name (its own, else the domain) and the domain itself.

const PALETTE = ["#6B5BD6", "#C4399E", "#1D8E45", "#2F6BE0", "#B4603A", "#0F7B7B", "#E0A100", "#111111"];

/** Same name, same colour, everywhere. */
export function colorFor(name: string): string {
  return PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
}

export interface ProjectMark {
  name: string;
  site: string;
  href: string;
  color: string;
}

/** Null when the creator has no project link. */
export function projectMark(workUrl: string | null | undefined, projectName?: string | null): ProjectMark | null {
  if (!workUrl) return null;
  const site = domainOf(workUrl);
  if (!site) return null;
  const name = projectName?.trim() || site;
  return { name, site, href: workUrl, color: colorFor(name) };
}
