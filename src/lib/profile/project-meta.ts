// "+ Add a past project" — read a project's name and one-liner from its page
// (DESIGN.md § Welcome v2, step 5). Pure, so it is tested without the network.

export interface ProjectMeta {
  name: string;
  description: string;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

function decode(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
      const k = e.toLowerCase();
      if (k in ENTITIES) return ENTITIES[k];
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith("#")) return String.fromCodePoint(Number(k.slice(1)));
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function metaContent(html: string, key: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content) return decode(content);
  }
  return "";
}

/** Name from og:site_name / og:title / <title>, then the domain; description from og or meta. */
export function parseProjectMeta(html: string, url: string): ProjectMeta {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  // "Linear – Plan and build products" → "Linear"
  const short = (s: string) => s.split(/\s+[|–—·:-]\s+/)[0]?.trim() ?? "";
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  // github.com/owner/repo → "repo"; github.com/owner → "owner" — never just "GitHub".
  let github = "";
  if (host === "github.com") {
    try {
      const [owner, repo] = new URL(url).pathname.split("/").filter(Boolean);
      github = repo ?? owner ?? "";
    } catch {}
  }
  const name = github || metaContent(html, "og:site_name") || short(metaContent(html, "og:title")) || short(title) || host;
  const description = metaContent(html, "og:description") || metaContent(html, "description") || metaContent(html, "twitter:description");
  return { name: clip(name, 40), description: clip(description, 80) };
}

/** "yourproduct.com" / "http://…" → an https URL on a public host, or null. */
export function normalizeProjectLink(raw: string): string | null {
  const t = raw.trim();
  if (t.length < 3 || t.length > 300 || /\s/.test(t)) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t.replace(/^http:/i, "https:") : `https://${t}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".") || isPrivateHost(url.hostname) || url.username || url.password) return null;
  return url.toString();
}

/** One string → the links in it: one per line, or separated by spaces/commas. */
export function splitLinks(text: string): string[] {
  return text.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

function attr(tag: string, name: string): string {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? tag.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"))?.[1] ?? "";
}

/** A URL from the page made absolute and https; null for anything else or a private host. */
function absolute(href: string, base: string): string | null {
  if (!href) return null;
  try {
    const u = new URL(decode(href), base);
    if (u.protocol === "http:") u.protocol = "https:";
    if (u.protocol !== "https:" || isPrivateHost(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface ProjectMedia {
  /** The share picture: og:image:secure_url → og:image → twitter:image. */
  image: string | null;
  /** apple-touch-icon, else the largest non-SVG <link rel=icon>. */
  icon: string | null;
}

export function parseProjectMedia(html: string, url: string): ProjectMedia {
  const pick = (...keys: string[]) => keys.map((k) => absolute(metaContent(html, k), url)).find(Boolean) ?? null;
  const image = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");

  const links = (html.match(/<link\b[^>]*>/gi) ?? []).map((tag) => ({
    rel: attr(tag, "rel").toLowerCase().split(/\s+/),
    href: attr(tag, "href"),
    size: Math.max(0, ...(attr(tag, "sizes").match(/\d+/g) ?? ["0"]).map(Number)),
    svg: /svg/i.test(attr(tag, "type")) || /\.svg(\?|$)/i.test(attr(tag, "href")),
  }));
  const touch = links.find((l) => l.rel.includes("apple-touch-icon") || l.rel.includes("apple-touch-icon-precomposed"));
  const icons = links.filter((l) => l.rel.includes("icon") && !l.svg).sort((a, b) => b.size - a.size);
  const icon = absolute(touch?.href ?? "", url) ?? absolute(icons[0]?.href ?? "", url);
  return { image, icon };
}

/** Refuse anything that isn't a public host — localhost, private and link-local ranges. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (h.includes(":")) return h === "::" || h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("::ffff:");
  return false;
}
