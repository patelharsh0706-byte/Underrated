import { describe, expect, it } from "vitest";

import { isRanked, PLACEMENT_BATTLES_REQUIRED } from "./placement";

describe("isRanked", () => {
  it("is false below the threshold", () => {
    expect(isRanked(0)).toBe(false);
    expect(isRanked(PLACEMENT_BATTLES_REQUIRED - 1)).toBe(false);
  });

  it("is true at and above the threshold", () => {
    expect(isRanked(PLACEMENT_BATTLES_REQUIRED)).toBe(true);
    expect(isRanked(PLACEMENT_BATTLES_REQUIRED + 1)).toBe(true);
  });
});
