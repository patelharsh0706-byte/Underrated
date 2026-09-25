import { describe, expect, it } from "vitest";

import { buildLiveTiles, newDelta, pctDelta, type HomeLiveCounts } from "./home-live";

const counts: HomeLiveCounts = {
  battles: { today: 56, yesterday: 50, week: 300, prevWeek: 400, all: 973 },
  people: { today: 12, yesterday: 0, week: 40, prevWeek: 40, all: 214 },
  creators: { total: 38, newToday: 5, newWeek: 14 },
  nominations: { today: 6, week: 19, all: 211 },
};

describe("pctDelta", () => {
  it("rounds the change against the previous period", () => {
    expect(pctDelta(56, 50, "yesterday")).toEqual({ text: "12% from yesterday", dir: "up" });
  });

  it("reports a fall as a positive number pointing down", () => {
    expect(pctDelta(300, 400, "last week")).toEqual({ text: "25% from last week", dir: "down" });
  });

  it("returns null when there is nothing to compare against", () => {
    expect(pctDelta(12, 0, "yesterday")).toBeNull();
  });

  it("treats no change as flat-up, not missing", () => {
    expect(pctDelta(40, 40, "last week")).toEqual({ text: "0% from last week", dir: "up" });
  });
});

describe("newDelta", () => {
  it("names the count and the window", () => {
    expect(newDelta(5, "today")).toEqual({ text: "5 new today", dir: "up" });
  });
});

describe("buildLiveTiles", () => {
  it("today compares against yesterday and counts new arrivals today", () => {
    const t = buildLiveTiles(counts, "today");
    expect(t.battles).toEqual({ value: 56, delta: { text: "12% from yesterday", dir: "up" } });
    expect(t.creators).toEqual({ value: 38, delta: { text: "5 new today", dir: "up" } });
    expect(t.people).toEqual({ value: 12, delta: null });
    expect(t.nominations).toEqual({ value: 6, delta: { text: "6 new today", dir: "up" } });
  });

  it("this week compares against the previous 7 days", () => {
    const t = buildLiveTiles(counts, "week");
    expect(t.battles.value).toBe(300);
    expect(t.battles.delta).toEqual({ text: "25% from last week", dir: "down" });
    expect(t.creators.delta?.text).toBe("14 new this week");
  });

  it("all time shows totals and hides every delta", () => {
    const t = buildLiveTiles(counts, "all");
    expect(t.battles).toEqual({ value: 973, delta: null });
    expect(t.people).toEqual({ value: 214, delta: null });
    expect(t.nominations).toEqual({ value: 211, delta: null });
  });
});
