import { describe, expect, it } from "vitest";

import {
  DAILY_HEAT_BATTLES_REQUIRED,
  DAILY_HEAT_VOTERS_REQUIRED,
  dailyHeat,
  isDailyHeatEligible,
} from "./daily-heat";

describe("isDailyHeatEligible", () => {
  it("requires both floors", () => {
    expect(isDailyHeatEligible(DAILY_HEAT_BATTLES_REQUIRED, DAILY_HEAT_VOTERS_REQUIRED)).toBe(true);
  });

  it("rejects enough battles from too few voters", () => {
    // The case this floor exists for: one busy session running up the count.
    expect(isDailyHeatEligible(8, 1)).toBe(false);
    expect(isDailyHeatEligible(14, DAILY_HEAT_VOTERS_REQUIRED - 1)).toBe(false);
  });

  it("rejects enough voters but too few battles", () => {
    expect(isDailyHeatEligible(DAILY_HEAT_BATTLES_REQUIRED - 1, 10)).toBe(false);
  });

  it("rejects a 1-0 record", () => {
    expect(isDailyHeatEligible(1, 1)).toBe(false);
  });
});

describe("dailyHeat", () => {
  it("is wins minus losses", () => {
    expect(dailyHeat(7, 1)).toBe(6);
    expect(dailyHeat(0, 3)).toBe(-3);
    expect(dailyHeat(4, 4)).toBe(0);
  });
});
