import { describe, expect, it } from "vitest";

import { MIN_JUDGES, pctUnderhyped, rankDemos } from "./rank";

const d = (id: string, judges: number, underhyped: number) => ({ id, judges, underhyped });

describe("pctUnderhyped", () => {
  it("rounds the share of Underhyped judgements", () => {
    expect(pctUnderhyped(d("a", 424, 331))).toBe(78);
  });
  it("is 0 for a demo nobody has judged", () => {
    expect(pctUnderhyped(d("a", 0, 0))).toBe(0);
  });
});

describe("rankDemos — RANKING.md § Demos", () => {
  it("needs at least 20 judges to be ranked", () => {
    expect(MIN_JUDGES).toBe(20);
    const { ranked, unranked } = rankDemos([d("few", 19, 19), d("enough", 20, 10)]);
    expect(ranked.map((r) => r.id)).toEqual(["enough"]);
    expect(unranked.map((r) => r.id)).toEqual(["few"]);
  });

  it("orders ranked demos by % underhyped, highest first", () => {
    const { ranked } = rankDemos([d("low", 100, 60), d("high", 100, 90), d("mid", 100, 75)]);
    expect(ranked.map((r) => r.id)).toEqual(["high", "mid", "low"]);
  });

  it("breaks a tie on % with more judges", () => {
    const { ranked } = rankDemos([d("small", 40, 30), d("big", 400, 300)]);
    expect(ranked.map((r) => r.id)).toEqual(["big", "small"]);
  });

  it("numbers ranks from 1 and keeps the input fields", () => {
    const { ranked } = rankDemos([d("b", 50, 40), d("a", 50, 45)]);
    expect(ranked[0]).toMatchObject({ id: "a", rank: 1, pct: 90 });
    expect(ranked[1]).toMatchObject({ id: "b", rank: 2, pct: 80 });
  });

  it("tells unranked demos how many more judges they need, most-judged first", () => {
    const { unranked } = rankDemos([d("x", 3, 3), d("y", 12, 9)]);
    expect(unranked.map((u) => [u.id, u.needs])).toEqual([["y", 8], ["x", 17]]);
  });

  it("does not change the list it was given", () => {
    const input = [d("a", 30, 10), d("b", 30, 20)];
    const copy = structuredClone(input);
    rankDemos(input);
    expect(input).toEqual(copy);
  });
});
