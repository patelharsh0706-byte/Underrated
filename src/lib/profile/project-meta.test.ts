import { describe, expect, it } from "vitest";

import { isPrivateHost, parseProjectMeta } from "./project-meta";

describe("parseProjectMeta", () => {
  it("prefers Open Graph tags", () => {
    const html = `<head><title>Ignored</title><meta property="og:site_name" content="Underhyped"><meta property="og:description" content="Discover people before everyone else does."></head>`;
    expect(parseProjectMeta(html, "https://underhyped.wtf")).toEqual({ name: "Underhyped", description: "Discover people before everyone else does." });
  });

  it("falls back to <title> (before the separator) and meta description", () => {
    const html = `<title>Linear – Plan and build products</title><meta content='Issue tracking &amp; planning' name='description'>`;
    expect(parseProjectMeta(html, "https://linear.app")).toEqual({ name: "Linear", description: "Issue tracking & planning" });
  });

  it("uses the domain when the page has nothing, and trims to 40 / 80", () => {
    expect(parseProjectMeta("<html>junk", "https://www.flexclout.com/x")).toEqual({ name: "flexclout.com", description: "" });
    const long = parseProjectMeta(`<meta property="og:title" content="${"A".repeat(60)}"><meta property="og:description" content="${"b ".repeat(60)}">`, "https://x.dev");
    expect(long.name.length).toBe(40);
    expect(long.description.length).toBeLessThanOrEqual(80);
  });
});

describe("isPrivateHost", () => {
  it("blocks localhost and private ranges, allows public hosts", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.4", "192.168.1.1", "172.20.0.1", "169.254.169.254", "[::1]", "fd00::1", "printer.local"]) {
      expect(isPrivateHost(h), h).toBe(true);
    }
    for (const h of ["underhyped.wtf", "8.8.8.8", "172.32.0.1"]) expect(isPrivateHost(h), h).toBe(false);
  });
});

describe("parseProjectMedia — share picture and icon", async () => {
  const { parseProjectMedia, normalizeProjectLink, splitLinks } = await import("./project-meta");
  const base = "https://flexclout.com/about";

  it("prefers og:image:secure_url, then og:image, then twitter:image; makes it absolute and https", () => {
    expect(parseProjectMedia(`<meta property="og:image" content="/og.png"><meta property="og:image:secure_url" content="https://cdn.flexclout.com/s.png">`, base).image).toBe("https://cdn.flexclout.com/s.png");
    expect(parseProjectMedia(`<meta property="og:image" content="/og.png">`, base).image).toBe("https://flexclout.com/og.png");
    expect(parseProjectMedia(`<meta name="twitter:image" content="http://flexclout.com/t.png">`, base).image).toBe("https://flexclout.com/t.png");
    expect(parseProjectMedia(`<meta property="og:image" content="https://flexclout.com/a.png?x=1&amp;y=2">`, base).image).toBe("https://flexclout.com/a.png?x=1&y=2");
  });

  it("drops private hosts and odd schemes", () => {
    expect(parseProjectMedia(`<meta property="og:image" content="http://169.254.169.254/x.png">`, base).image).toBeNull();
    expect(parseProjectMedia(`<meta property="og:image" content="javascript:alert(1)">`, base).image).toBeNull();
    expect(parseProjectMedia("", base)).toEqual({ image: null, icon: null });
  });

  it("icon: apple-touch-icon, else the largest non-SVG icon", () => {
    expect(parseProjectMedia(`<link rel="icon" href="/f.png"><link rel="apple-touch-icon" href="/apple.png">`, base).icon).toBe("https://flexclout.com/apple.png");
    expect(parseProjectMedia(`<link rel="icon" sizes="16x16" href="/16.png"><link rel="icon" type="image/svg+xml" href="/i.svg"><link rel="shortcut icon" sizes="192x192" href="/192.png">`, base).icon).toBe("https://flexclout.com/192.png");
  });

  it("normalizeProjectLink and splitLinks", () => {
    expect(normalizeProjectLink("flexclout.com")).toBe("https://flexclout.com/");
    expect(normalizeProjectLink("http://flexclout.com/x")).toBe("https://flexclout.com/x");
    expect(normalizeProjectLink("ftp://flexclout.com")).toBeNull();
    expect(normalizeProjectLink("https://user:pw@flexclout.com")).toBeNull();
    expect(normalizeProjectLink("10.0.0.1")).toBeNull();
    expect(normalizeProjectLink("nodot")).toBeNull();
    expect(splitLinks(" a.com\nb.com, c.com\t d.com ")).toEqual(["a.com", "b.com", "c.com", "d.com"]);
  });
});

describe("parseProjectMeta — GitHub links", async () => {
  const { parseProjectMeta } = await import("./project-meta");
  it("names a repo after the repo and a profile after the owner", () => {
    const html = `<meta property="og:site_name" content="GitHub"><meta property="og:description" content="The React Framework">`;
    expect(parseProjectMeta(html, "https://github.com/vercel/next.js").name).toBe("next.js");
    expect(parseProjectMeta(html, "https://github.com/vercel").name).toBe("vercel");
    expect(parseProjectMeta(html, "https://github.com/").name).toBe("GitHub");
  });
});
