import { describe, expect, it } from "vitest";

import { deriveActivity, type BattleForActivity } from "./activity";

const NOW = new Date("2026-10-04T12:00:00Z").getTime();
const ago = (h: number) => new Date(NOW - h * 3600_000);
const battle = (over: Partial<BattleForActivity>): BattleForActivity => ({
  creatorAId: "me",
  creatorBId: "them",
  winnerId: "me",
  auraABefore: 1510,
  auraAAfter: 1526,
  auraBBefore: 1500,
  auraBAfter: 1484,
  opponentName: "Roman",
  createdAt: ago(2),
  ...over,
});

describe("deriveActivity", () => {
  it("lists wins as 'Beat X' with a short time", () => {
    expect(deriveActivity("me", [battle({})], NOW)).toEqual([{ icon: "⚔️", text: "Beat Roman", when: "2h" }]);
  });

  it("adds an upward 100-Aura milestone, shown above the win that caused it", () => {
    const items = deriveActivity("me", [battle({ auraABefore: 1590, auraAAfter: 1606 })], NOW);
    expect(items.map((i) => i.text)).toEqual(["Crossed 1,600 Aura", "Beat Roman"]);
  });

  it("ignores losses and downward crossings", () => {
    expect(deriveActivity("me", [battle({ winnerId: "them", auraABefore: 1605, auraAAfter: 1589 })], NOW)).toEqual([]);
  });

  it("works when the creator is side B", () => {
    const b = battle({ creatorAId: "them", creatorBId: "me", winnerId: "me", auraBBefore: 1495, auraBAfter: 1510, opponentName: "aloha" });
    expect(deriveActivity("me", [b], NOW).map((i) => i.text)).toEqual(["Crossed 1,500 Aura", "Beat aloha"]);
  });

  it("is newest first and capped at 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => battle({ createdAt: ago(i + 1), opponentName: `P${i}` }));
    const items = deriveActivity("me", many, NOW);
    expect(items).toHaveLength(5);
    expect(items[0].text).toBe("Beat P0");
  });
});
