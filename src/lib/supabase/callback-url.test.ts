import { describe, expect, it } from "vitest";

import { buildCallbackUrl, safeNextPath } from "./callback-url";

// Regression guard for ISSUES.md § 2026-09-21 "Signing in through the Spot
// prompt created no profile". Every sign-in entry point builds its OAuth
// callback URL here, from the page's own origin — never from an env var that
// can be unset on a deploy.
const ORIGIN = "https://www.underhyped.wtf";

describe("buildCallbackUrl", () => {
  it("routes back to /auth/callback on the given origin with next encoded", () => {
    expect(buildCallbackUrl(ORIGIN, "/c/romg_dev", "/receipts")).toBe(
      "https://www.underhyped.wtf/auth/callback?next=%2Fc%2Fromg_dev",
    );
  });

  it("uses the caller's fallback when next is missing", () => {
    // The receipts entry points default to /receipts…
    expect(buildCallbackUrl(ORIGIN, undefined, "/receipts")).toBe(
      "https://www.underhyped.wtf/auth/callback?next=%2Freceipts",
    );
    // …and the /sign-in page keeps its own default — creators arriving from
    // the submit flow must still land on /submit.
    expect(buildCallbackUrl(ORIGIN, null, "/submit")).toBe(
      "https://www.underhyped.wtf/auth/callback?next=%2Fsubmit",
    );
  });

  it("accepts the root path as-is", () => {
    expect(buildCallbackUrl(ORIGIN, "/", "/receipts")).toContain("next=%2F");
  });

  it("rejects anything that is not an in-app absolute path", () => {
    for (const bad of [
      "//evil.com",
      "https://evil.com",
      "/\\evil.com",
      "evil.com",
      "javascript:alert(1)",
      "",
    ]) {
      expect(buildCallbackUrl(ORIGIN, bad, "/receipts")).toBe(
        "https://www.underhyped.wtf/auth/callback?next=%2Freceipts",
      );
    }
  });

  it("does not double the slash when the origin carries one", () => {
    expect(buildCallbackUrl("https://www.underhyped.wtf/", "/receipts", "/receipts")).toBe(
      "https://www.underhyped.wtf/auth/callback?next=%2Freceipts",
    );
  });

  it("works for a preview origin, so the allow-list is the only remaining gate", () => {
    expect(buildCallbackUrl("https://underhyped-abc123-team.vercel.app", "/receipts", "/receipts")).toBe(
      "https://underhyped-abc123-team.vercel.app/auth/callback?next=%2Freceipts",
    );
  });
});

describe("safeNextPath", () => {
  it("is the guard the auth routes reuse when reading next back off the URL", () => {
    expect(safeNextPath("/c/romg_dev", "/receipts")).toBe("/c/romg_dev");
    expect(safeNextPath("//evil.com", "/receipts")).toBe("/receipts");
    expect(safeNextPath(null, "/receipts")).toBe("/receipts");
    // An empty fallback lets a route distinguish "no preference" from a value.
    expect(safeNextPath(undefined, "")).toBe("");
  });
});
