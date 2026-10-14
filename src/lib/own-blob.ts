// Project pictures and logos are saved only when they live in OUR Blob store
// (DECISIONS.md § 2026-10-13 "Profile projects as cards"). The store's public
// host is its id: from the token locally (vercel_blob_rw_<id>_<secret>), from
// BLOB_STORE_ID (store_<id>) in production, which signs in with OIDC and has no
// token → <id>.public.blob.vercel-storage.com. BLOB_PUBLIC_HOST overrides it.

type Env = Record<string, string | undefined>;

function ownHost(env: Env): string | null {
  if (env.BLOB_PUBLIC_HOST) return env.BLOB_PUBLIC_HOST.toLowerCase();
  const id = (env.BLOB_READ_WRITE_TOKEN ?? "").split("_")[3] || (env.BLOB_STORE_ID ?? "").replace(/^store_/, "");
  return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Whether a Blob store is set up at all (a token locally, OIDC + BLOB_STORE_ID in production). */
export function blobConfigured(env: Env = process.env): boolean {
  return !!ownHost(env);
}

/** An https URL on our own store, under projects/. Anything else is false. */
export function isOwnBlobUrl(value: string | null | undefined, env: Env = process.env): boolean {
  if (!value) return false;
  const host = ownHost(env);
  if (!host) return false;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  return u.protocol === "https:" && u.hostname === host && !u.port && !u.username && u.pathname.startsWith("/projects/");
}

/** The URL when it's ours, else null — what gets written to the database. */
export function ownBlobOrNull(value: string | null | undefined, env: Env = process.env): string | null {
  return isOwnBlobUrl(value, env) ? value! : null;
}

/** A picture the owner uploaded ("↑ Use my own picture") — kept when the site's picture is re-read. */
export function isOwnPicture(url: string | null | undefined): boolean {
  return !!url && url.includes("/projects/custom/");
}
