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
            auraAtSpot: 1500,
      },
      {
        rankAtSpot: 100,
        currentRank: 70,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "B",
        username: "b",
            auraAtSpot: 1500,
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
            auraAtSpot: 1500,
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-09-17"),
        name: "New",
        username: "new",
            auraAtSpot: 1500,
      },
    ];
    const best = pickBestSpot(spots);
    expect(best?.name).toBe("New");
  });

  it("excludes a creator who has not climbed", () => {
    const flatOrFalling: SpotForReceipt[] = [
      {
        rankAtSpot: 50,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Flat",
        username: "flat",
        auraAtSpot: 1500,
      },
      {
        rankAtSpot: 40,
        currentRank: 90,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Fell",
        username: "fell",
        auraAtSpot: 1500,
      },
    ];
    expect(pickBestSpot(flatOrFalling)).toBeUndefined();
  });

  it("excludes a spot whose creator is still in placement now", () => {
    const stillUnranked: SpotForReceipt[] = [
      {
        rankAtSpot: 47,
        currentRank: null,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Unranked Now",
        username: "unranked",
        auraAtSpot: 1500,
      },
    ];
    expect(pickBestSpot(stillUnranked)).toBeUndefined();
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
            auraAtSpot: 1500,
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: false,
        createdAt: new Date("2026-01-01"),
        name: "Inactive",
        username: "inactive",
            auraAtSpot: 1500,
      },
      {
        rankAtSpot: 100,
        currentRank: 50,
        isActive: true,
        createdAt: new Date("2026-01-01"),
        name: "Valid",
        username: "valid",
            auraAtSpot: 1500,
      },
    ];
    const best = pickBestSpot(spots);
    expect(best?.name).toBe("Valid");
  });
});
