import { describe, expect, it } from "vitest";

import type { PickResult } from "@/app/actions/battle";

import { freshestAura } from "./aura";

// Regression guard for ISSUES.md § 2026-09-12 "A picked creator came back with
// its old Aura". The next pair is prefetched, so the row it carries can predate
// a pick the voter has already made.
const WINNER = "11111111-1111-4111-8111-111111111111";
const LOSER = "22222222-2222-4222-8222-222222222222";

const pick = (over: Partial<PickResult> = {}): PickResult => ({
  winnerId: WINNER,
  loserId: LOSER,
  winnerAura: 1512,
  loserAura: 1488,
  delta: 12,
  counted: true,
  battlesToday: 1,
  ...over,
});

describe("freshestAura", () => {
  it("falls back to the fetched row when nothing else is known", () => {
    expect(freshestAura({ id: WINNER, aura: 1500 }, null, {})).toBe(1500);
  });

  it("shows the result of the pick on screen", () => {
    expect(freshestAura({ id: WINNER, aura: 1500 }, pick(), {})).toBe(1512);
    expect(freshestAura({ id: LOSER, aura: 1500 }, pick(), {})).toBe(1488);
  });

  it("prefers a pick this session made over a stale prefetched row", () => {
    // The bug: this creator was picked two battles ago and came back in a pair
    // that had been fetched beforehand, still carrying 1500.
    expect(
      freshestAura({ id: WINNER, aura: 1500 }, null, { [WINNER]: 1512 }),
    ).toBe(1512);
  });

  it("leaves creators the session never picked alone", () => {
    const other = "33333333-3333-4333-8333-333333333333";
    expect(
      freshestAura({ id: other, aura: 1466 }, pick(), { [WINNER]: 1512 }),
    ).toBe(1466);
  });

  it("lets the current result win over an older remembered value", () => {
    // Same creator picked again: the transaction just reported a newer figure.
    expect(
      freshestAura({ id: WINNER, aura: 1500 }, pick({ winnerAura: 1524 }), {
        [WINNER]: 1512,
      }),
    ).toBe(1524);
  });
});
