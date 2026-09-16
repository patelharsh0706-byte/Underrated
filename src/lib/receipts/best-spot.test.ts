import { describe, it, expect } from "vitest";
import { pickBestSpot, climbOf, type SpotForReceipt } from "./best-spot";

describe("climbOf", () => {
  it("computes positive climb", () => {
    expect(climbOf(100, 50)).toBe(50);
  });

  it("computes negative climb", () => {
    expect(climbOf(50, 100)).toBe(-50);
  });

  it("returns -Infinity for null ranks", () => {
    expect(climbOf(null, 50)).toBe(-Infinity);
    expect(climbOf(100, null)).toBe(-Infinity);
  });
});

describe("pickBestSpot", () => {
  it("returns undefined for empty list", () => {
    expect(pickBestSpot([])).toBeUndefined();
  });

  it("returns max climb", () => {
    const spots: SpotForReceipt[] = [
      {
        rankAtSpot: 100,
        currentRank: 60,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "A",
        username: "a",
      },
      {
        rankAtSpot: 100,
        currentRank: 70,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "B",
        username: "b",
      },
    ];
    const best = pickBestSpot(spots);
    expect(best?.name).toBe("A"); // 40 climb vs 30
  });

  it("ties go to newest", () => {
    const spots: SpotForReceipt[] = [
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Old",
        username: "old",
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-09-17"),
        name: "New",
        username: "new",
      },
    ];
    const best = pickBestSpot(spots);
    expect(best?.name).toBe("New");
  });

  it("excludes null ranks and inactive", () => {
    const spots: SpotForReceipt[] = [
      {
        rankAtSpot: null,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Null Rank",
        username: "nullrank",
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: false,
        createdAt: new Date("2026-01-01"),
        name: "Inactive",
        username: "inactive",
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Valid",
        username: "valid",
      },
    ];
    const best = pickBestSpot(spots);
    expect(best?.name).toBe("Valid");
  });
});
