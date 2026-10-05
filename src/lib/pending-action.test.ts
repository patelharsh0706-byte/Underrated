import { describe, expect, it } from "vitest";

import { PENDING_TTL_MS, parsePending } from "./pending-action";

const NOW = 1_800_000_000_000;
const pick = (over: object = {}) =>
  JSON.stringify({ type: "pick", pair: [{ id: "a" }, { id: "b" }], winnerId: "a", loserId: "b", at: NOW - 1000, ...over });

describe("parsePending — the pick attempted before X sign-in", () => {
  it("returns a fresh pick of the asked type", () => {
    expect(parsePending(pick(), "pick", NOW)).toMatchObject({ type: "pick", winnerId: "a", loserId: "b" });
  });

  it("drops it after 10 minutes", () => {
    expect(parsePending(pick({ at: NOW - PENDING_TTL_MS - 1 }), "pick", NOW)).toBeNull();
  });

  it("ignores a different type, junk and missing pairs", () => {
    expect(parsePending(pick(), "demo", NOW)).toBeNull();
    expect(parsePending("{not json", "pick", NOW)).toBeNull();
    expect(parsePending(pick({ pair: [{ id: "a" }] }), "pick", NOW)).toBeNull();
    expect(parsePending(null, "pick", NOW)).toBeNull();
  });

  it("reads a demo judgement", () => {
    const raw = JSON.stringify({ type: "demo", demoId: "d1", underhyped: true, at: NOW });
    expect(parsePending(raw, "demo", NOW)).toMatchObject({ demoId: "d1", underhyped: true });
  });
});
