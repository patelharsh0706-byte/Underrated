import "server-only";

import { createHash } from "node:crypto";

import { put } from "@vercel/blob";

import { parseProjectMedia, parseProjectMeta } from "@/lib/profile/project-meta";
import { sniffImage } from "@/lib/image-sniff";
import { blobConfigured } from "@/lib/own-blob";
import { fetchPublicImage, fetchPublicPage, MAX_IMAGE_BYTES } from "@/lib/safe-fetch";
import { takeScreenshot } from "@/lib/screenshot";
import { getUnavatarUrl } from "@/lib/unavatar";

// A project's share picture and logo, copied into our public Blob store and
// served from there — pages never load images from the project's own site.
// ARCHITECTURE.md § Project pictures and logos on profiles.

/**
 * Never throws. Named by a hash of the bytes, so the same picture pasted twice
 * is one file, and a changed picture is a new URL (no stale CDN copy).
 */
export async function storeProjectImage(source: string | null, kind: "image" | "logo"): Promise<string | null> {
  if (!source || !blobConfigured()) return null;
  const img = await fetchPublicImage(source);
  if (!img) return null;
  try {
    const name = createHash("sha256").update(img.body).digest("hex").slice(0, 32);
    const blob = await put(`projects/${kind}/${name}.${img.type.ext}`, img.body, {
      access: "public",
      contentType: img.type.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  } catch {
    return null;
  }
}

export interface ProjectMediaResult {
  url: string;
  name: string;
  description: string;
  imageUrl: string | null;
  logoUrl: string | null;
  /** False when the page couldn't be read (the name is then just the domain). */
  read: boolean;
}

/**
 * Read a project's page once: name, one line, picture, logo. A page that can't
 * be read still gives a project — the domain as its name; its picture is then a
 * homepage screenshot if Microlink can take one, else none (the letter panel).
 * DECISIONS.md § 2026-10-13 (paste box), § 2026-10-14 (screenshot fallback).
 */
export async function resolveProjectMedia(href: string, { store = true } = {}): Promise<ProjectMediaResult> {
  let page: { html: string; url: string } | null = null;
  try {
    page = await fetchPublicPage(href);
  } catch {
    page = null;
  }
  const meta = parseProjectMeta(page?.html ?? "", page?.url ?? href);
  // Preview mode has no database: nothing is copied into the store.
  const media = page && store ? parseProjectMedia(page.html, page.url) : { image: null, icon: null };
  const [imageUrl, logoUrl] = await Promise.all([
    // The site's share picture; none (or not usable) → a homepage screenshot (Microlink).
    storeProjectImage(media.image, "image").then(async (stored) => stored ?? (store ? storeProjectImage(await takeScreenshot(href), "image") : null)),
    // The page's own icon, else unavatar's guess for the domain, else the letter tile.
    storeProjectImage(media.icon, "logo").then((stored) => stored ?? (store ? storeProjectImage(getUnavatarUrl(href), "logo") : null)),
  ]);
  return { url: href, name: meta.name, description: meta.description, imageUrl, logoUrl, read: !!page };
}

/** The owner's own picture ("↑ Use my own picture"): PNG, JPG or WebP by its bytes, ≤ 2 MB. */
export async function storeOwnPicture(body: Buffer): Promise<string | null> {
  if (!blobConfigured() || !body.length || body.length > MAX_IMAGE_BYTES) return null;
  const type = sniffImage(body);
  if (!type || type.ext === "gif") return null;
  try {
    const name = createHash("sha256").update(body).digest("hex").slice(0, 32);
    const blob = await put(`projects/custom/${name}.${type.ext}`, body, { access: "public", contentType: type.contentType, addRandomSuffix: false, allowOverwrite: true });
    return blob.url;
  } catch {
    return null;
  }
}

export { isOwnPicture } from "@/lib/own-blob";
