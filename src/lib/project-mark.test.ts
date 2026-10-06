import { describe, expect, it } from "vitest";

import { colorFor, projectMark } from "./project-mark";

describe("projectMark — the leaderboard's Cooking column", () => {
  it("uses the project's own name, else the domain", () => {
    expect(projectMark("https://www.slottedarc.com/", "Slotted Arc")).toMatchObject({ name: "Slotted Arc", site: "slottedarc.com" });
    expect(projectMark("https://underhyped.wtf", null)).toMatchObject({ name: "underhyped.wtf", site: "underhyped.wtf" });
  });

  it("is null without a project link", () => {
    expect(projectMark(null, "Anything")).toBeNull();
    expect(projectMark("", null)).toBeNull();
  });

  it("gives the same name the same colour", () => {
    expect(colorFor("Underhyped")).toBe(colorFor("Underhyped"));
  });
});
