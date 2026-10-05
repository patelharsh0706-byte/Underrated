import { describe, expect, it } from "vitest";

import { shippingUrlFrom } from "./x-profile";

describe("shippingUrlFrom — prefill for 'What are you building?'", () => {
  it("uses the Website field first (expanded, not the t.co link)", () => {
    expect(
      shippingUrlFrom({ url: "https://t.co/abc", entities: { url: { urls: [{ expanded_url: "https://underhyped.wtf" }] } }, description: "building other.app" }),
    ).toBe("https://underhyped.wtf");
  });

  it("falls back to the first link X marks in the bio", () => {
    expect(
      shippingUrlFrom({ description: "building https://t.co/x1", entities: { description: { urls: [{ expanded_url: "https://shipnotes.app/" }] } } }),
    ).toBe("https://shipnotes.app");
  });

  it("then to a plain domain written in the bio", () => {
    expect(shippingUrlFrom({ description: "Building underhyped.wtf | ex-VC | dm open" })).toBe("https://underhyped.wtf");
  });

  it("skips links back to X and things that only look like domains", () => {
    expect(shippingUrlFrom({ description: "follow x.com/harsh · shipped v2.0 · 3.5k users" })).toBeNull();
    expect(shippingUrlFrom({ entities: { description: { urls: [{ expanded_url: "https://twitter.com/foo" }] } }, description: "see loopkit.dev" })).toBe("https://loopkit.dev");
  });

  it("returns null when nothing points anywhere", () => {
    expect(shippingUrlFrom({ description: "building stuff | dm open" })).toBeNull();
    expect(shippingUrlFrom({})).toBeNull();
  });
});
