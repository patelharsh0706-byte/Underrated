import { describe, expect, it } from "vitest";

import { blobConfigured, isOwnBlobUrl, ownBlobOrNull } from "./own-blob";

const env = { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_AbC123_secretpart" };
const ours = "https://abc123.public.blob.vercel-storage.com/projects/image/0a1b.png";

describe("isOwnBlobUrl", () => {
  it("accepts our store under projects/", () => {
    expect(isOwnBlobUrl(ours, env)).toBe(true);
  });

  it("rejects another store, another folder, http, a lookalike host and junk", () => {
    expect(isOwnBlobUrl("https://zzz999.public.blob.vercel-storage.com/projects/image/0a1b.png", env)).toBe(false);
    expect(isOwnBlobUrl("https://abc123.public.blob.vercel-storage.com/avatars/x.png", env)).toBe(false);
    expect(isOwnBlobUrl("http://abc123.public.blob.vercel-storage.com/projects/image/0a1b.png", env)).toBe(false);
    expect(isOwnBlobUrl("https://abc123.public.blob.vercel-storage.com.evil.com/projects/x.png", env)).toBe(false);
    expect(isOwnBlobUrl("https://user@abc123.public.blob.vercel-storage.com/projects/x.png", env)).toBe(false);
    expect(isOwnBlobUrl("/preview/flexclout.svg", env)).toBe(false);
    expect(isOwnBlobUrl(null, env)).toBe(false);
  });

  it("rejects everything when no store is configured", () => {
    expect(isOwnBlobUrl(ours, {})).toBe(false);
  });

  it("production: no token, the store from BLOB_STORE_ID (OIDC sign-in)", () => {
    const prod = { BLOB_STORE_ID: "store_AbC123" };
    expect(isOwnBlobUrl(ours, prod)).toBe(true);
    expect(isOwnBlobUrl("https://zzz999.public.blob.vercel-storage.com/projects/a.png", prod)).toBe(false);
    expect(blobConfigured(prod)).toBe(true);
    expect(blobConfigured({})).toBe(false);
  });

  it("honours BLOB_PUBLIC_HOST", () => {
    expect(isOwnBlobUrl("https://cdn.example.com/projects/a.png", { BLOB_PUBLIC_HOST: "cdn.example.com" })).toBe(true);
  });

  it("ownBlobOrNull keeps ours and drops the rest", () => {
    expect(ownBlobOrNull(ours, env)).toBe(ours);
    expect(ownBlobOrNull("https://evil.com/projects/a.png", env)).toBeNull();
  });
});
