import "server-only";

import { lookup } from "node:dns/promises";
import type { IncomingMessage } from "node:http";
import { request } from "node:https";
import type { LookupFunction } from "node:net";

import { isPrivateHost } from "@/lib/profile/project-meta";

import { sniffImage, type ImageType } from "./image-sniff";

// Our server fetching a URL someone typed (a project page, its share picture,
// its icon). https only, public hosts only, ≤ 3 redirects, a hard time limit
// and a size cap. ARCHITECTURE.md § Project pictures and logos on profiles.

const USER_AGENT = "UnderhypedBot/1.0 (+https://underhyped.wtf)";

/**
 * The DNS answer, checked at connect time: the address checked is the address
 * used. Checking with lookup() and then calling fetch() resolved the name a
 * second time, and a short-TTL domain could answer with 10.x or
 * 169.254.169.254 the second time (DNS rebinding).
 */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }).then(
    (addrs) => {
      if (!addrs.length || addrs.some((a) => isPrivateHost(a.address))) return callback(new Error(`refused private address for ${hostname}`), "", 4);
      if (options.all) return callback(null, addrs);
      callback(null, addrs[0].address, addrs[0].family);
    },
    (err: NodeJS.ErrnoException) => callback(err, "", 4),
  );
};

function getOnce(url: URL, signal: AbortSignal, accept: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request(url, { lookup: publicOnlyLookup, signal, headers: { "user-agent": USER_AGENT, accept } }, resolve);
    req.on("error", reject);
    req.end();
  });
}

interface SafeGetOptions {
  accept: string;
  maxBytes: number;
  timeoutMs: number;
  /** Checked against the Content-Type before the body is read. */
  allowType: (contentType: string) => boolean;
  /** Pages: keep the first maxBytes. Images: anything larger is refused. */
  truncate: boolean;
}

/** One GET, following at most 3 redirects. Null on anything unexpected; throws only on network errors. */
async function safeGet(start: string, o: SafeGetOptions): Promise<{ body: Buffer; url: string } | null> {
  const signal = AbortSignal.timeout(o.timeoutMs);
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" || isPrivateHost(url.hostname)) return null;
    const res = await getOnce(url, signal, o.accept);
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      res.destroy();
      const next = res.headers.location;
      if (!next) return null;
      url = new URL(next, url);
      continue;
    }
    if (status < 200 || status >= 300 || !o.allowType((res.headers["content-type"] ?? "").toLowerCase())) {
      res.destroy();
      return null;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of res) {
      chunks.push(chunk as Buffer);
      size += (chunk as Buffer).length;
      if (size > o.maxBytes) break;
    }
    res.destroy();
    if (size > o.maxBytes && !o.truncate) return null;
    return { body: Buffer.concat(chunks).subarray(0, o.maxBytes), url: url.toString() };
  }
  return null;
}

/** A project's page — the first 300 KB of its HTML. */
export async function fetchPublicPage(start: string): Promise<{ html: string; url: string } | null> {
  const got = await safeGet(start, { accept: "text/html", maxBytes: 300_000, timeoutMs: 4000, allowType: (t) => t.includes("html"), truncate: true });
  return got ? { html: new TextDecoder().decode(got.body), url: got.url } : null;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** A share picture or icon: PNG, JPEG, WebP or GIF by its bytes, ≤ 2 MB. Never throws. */
export async function fetchPublicImage(start: string): Promise<{ body: Buffer; type: ImageType } | null> {
  try {
    const got = await safeGet(start, {
      accept: "image/png,image/jpeg,image/webp,image/gif",
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: 4000,
      // Some servers send octet-stream; the bytes decide below.
      allowType: (t) => t.startsWith("image/") || t.startsWith("application/octet-stream") || t === "",
      truncate: false,
    });
    if (!got || !got.body.length) return null;
    const type = sniffImage(got.body);
    return type ? { body: got.body, type } : null;
  } catch {
    return null;
  }
}
