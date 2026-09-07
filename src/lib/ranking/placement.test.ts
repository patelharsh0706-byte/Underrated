import { describe, expect, it } from "vitest";

import {
  isPlacementTurn,
  isRanked,
  PLACEMENT_BATTLES_REQUIRED,
  PLACEMENT_VOTERS_REQUIRED,
} from "./placement";

const B = PLACEMENT_BATTLES_REQUIRED;
const V = PLACEMENT_VOTERS_REQUIRED;

describe("isRanked", () => {
  it("is false below the battle threshold, however many voters", () => {
    expect(isRanked(0, V)).toBe(false);
    expect(isRanked(B - 1, V)).toBe(false);
    expect(isRanked(B - 1, V + 100)).toBe(false);
  });

  it("is false below the voter threshold, however many battles", () => {
    expect(isRanked(B, 0)).toBe(false);
    expect(isRanked(B, V - 1)).toBe(false);
    // The real @alohaproxy case: 13 battles from 2 sessions is not a rank.
    expect(isRanked(13, 2)).toBe(false);
  });

  it("is true only once both conditions hold", () => {
    expect(isRanked(B, V)).toBe(true);
    expect(isRanked(B + 1, V + 1)).toBe(true);
  });

  it("is false when neither condition holds", () => {
    expect(isRanked(0, 0)).toBe(false);
  });
});

describe("isPlacementTurn", () => {
  it("gives a brand-new voter a placement pairing", () => {
    expect(isPlacementTurn(0)).toBe(true);
  });

  it("alternates on every battle", () => {
    const turns = [0, 1, 2, 3, 4, 5].map(isPlacementTurn);
    expect(turns).toEqual([true, false, true, false, true, false]);
  });

  it("never returns the same answer twice in a row", () => {
    for (let n = 0; n < 50; n++) {
      expect(isPlacementTurn(n)).not.toBe(isPlacementTurn(n + 1));
    }
  });
});
