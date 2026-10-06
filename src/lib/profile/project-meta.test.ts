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
