import { describe, expect, it } from "vitest";

import { computeEloUpdate, expectedScore } from "./elo";

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it("sums to 1 for both sides", () => {
    expect(expectedScore(1500, 1700) + expectedScore(1700, 1500)).toBeCloseTo(1);
  });

  it("favors the higher rating", () => {
    expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5);
    expect(expectedScore(1500, 1700)).toBeLessThan(0.5);
  });
});

describe("computeEloUpdate", () => {
  it("splits evenly between equal-rated creators", () => {
    const { delta, winnerAfter, loserAfter } = computeEloUpdate(1500, 1500);
    expect(delta).toBe(12);
    expect(winnerAfter).toBe(1512);
    expect(loserAfter).toBe(1488);
  });

  it("rewards an upset more than a favorite winning", () => {
    const upset = computeEloUpdate(1500, 1700); // lower rated wins
    const favorite = computeEloUpdate(1700, 1500); // higher rated wins
    expect(upset.delta).toBeGreaterThan(favorite.delta);
  });

  it("matches known deltas at K=24", () => {
    expect(computeEloUpdate(1500, 1600).delta).toBe(15);
    expect(computeEloUpdate(1500, 1700).delta).toBe(18);
    expect(computeEloUpdate(1500, 1900).delta).toBe(22);
    expect(computeEloUpdate(1700, 1500).delta).toBe(6);
    expect(computeEloUpdate(1900, 1500).delta).toBe(2);
  });

  it("is zero-sum: winner's gain equals loser's loss", () => {
    const { delta, winnerAfter, loserAfter } = computeEloUpdate(1432, 1587);
    expect(winnerAfter - 1432).toBe(delta);
    expect(1587 - loserAfter).toBe(delta);
  });

  it("never produces a negative delta", () => {
    // Even a massive underdog winning should never lose Aura.
    const { delta } = computeEloUpdate(800, 2400);
    expect(delta).toBeGreaterThan(0);
  });
});
