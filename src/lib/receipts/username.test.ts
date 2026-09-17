import { describe, expect, it } from "vitest";

import { RESERVED_USERNAMES, resolveUsername, usernameFromEmail } from "./username";

describe("usernameFromEmail", () => {
  it("takes the local part, lowercased", () => {
    expect(usernameFromEmail("PatelHarsh0706@gmail.com")).toBe("patelharsh0706");
  });

  it("drops a plus tag", () => {
    expect(usernameFromEmail("harsh+underhyped@gmail.com")).toBe("harsh");
  });

  it("collapses dots and punctuation to single hyphens", () => {
    expect(usernameFromEmail("first.last..name@example.com")).toBe("first-last-name");
  });

  it("trims leading and trailing separators", () => {
    expect(usernameFromEmail("_harsh_@example.com")).toBe("harsh");
  });

  it("caps length", () => {
    expect(usernameFromEmail("a".repeat(40) + "@example.com")).toHaveLength(20);
  });

  it("falls back when nothing usable survives", () => {
    expect(usernameFromEmail("..@example.com")).toBe("picker");
    expect(usernameFromEmail("a@example.com")).toBe("picker");
  });
});

describe("resolveUsername", () => {
  const takenSet = (...names: string[]) => {
    const set = new Set(names);
    return (candidate: string) => Promise.resolve(set.has(candidate));
  };

  it("returns the base when it is free", async () => {
    expect(await resolveUsername("harsh", takenSet())).toBe("harsh");
  });

  it("suffixes past a collision", async () => {
    expect(await resolveUsername("harsh", takenSet("harsh"))).toBe("harsh-2");
  });

  it("keeps walking past several collisions", async () => {
    expect(await resolveUsername("harsh", takenSet("harsh", "harsh-2", "harsh-3"))).toBe("harsh-4");
  });

  it("skips reserved names", async () => {
    const reserved = [...RESERVED_USERNAMES][0];
    const result = await resolveUsername(reserved, takenSet());
    expect(result).not.toBe(reserved);
    expect(result.startsWith(reserved)).toBe(true);
  });

  it("never returns a name longer than the cap", async () => {
    const base = "a".repeat(20);
    const result = await resolveUsername(base, takenSet(base));
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("falls back to a unique handle when every variant is taken", async () => {
    const result = await resolveUsername("harsh", () => Promise.resolve(true), 3);
    expect(result.startsWith("picker-")).toBe(true);
  });
});
