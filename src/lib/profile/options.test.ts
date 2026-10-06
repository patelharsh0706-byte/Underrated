import { describe, expect, it } from "vitest";

import { profileEditSchema } from "./options";

describe("profileEditSchema — DATABASE.md § Profile v2 fields", () => {
  it("accepts a full profile and normalizes the project link to https", () => {
    const r = profileEditSchema.parse({
      tagline: "Building products and communities for talented people.",
      about: "I build weird internet products.",
      location: "🇸🇬 Singapore",
      projectName: "Underhyped.wtf",
      projectUrl: "underhyped.wtf",
      workHow: "Solo",
      workStage: "Building",
      workCareer: "3–5 years",
      wantsToMeet: ["Founders", "Designers"],
      openTo: ["🤝 Collaborating", "🧪 Looking for beta users"],
      into: ["AI", "Community"],
      past: [{ name: "Flexclout", year: 2026, status: "sunset" }],
    });
    expect(r.projectUrl).toBe("https://underhyped.wtf");
    expect(r.past[0]).toMatchObject({ name: "Flexclout", line: "", url: "", year: 2026 });
  });

  it("enforces the limits: About 200, meet 2, Open to 3, Into 6", () => {
    expect(profileEditSchema.safeParse({ about: "x".repeat(201) }).success).toBe(false);
    expect(profileEditSchema.safeParse({ wantsToMeet: ["Builders", "Founders", "Designers"] }).success).toBe(false);
    expect(profileEditSchema.safeParse({ openTo: ["🧑‍💻 Hiring", "💰 Raising", "💸 Investing", "🛠 Taking clients"] }).success).toBe(false);
    expect(profileEditSchema.safeParse({ into: ["AI", "SaaS", "Design", "Music", "Art", "Data", "Games"] }).success).toBe(false);
  });

  it("rejects anything outside the fixed lists", () => {
    expect(profileEditSchema.safeParse({ workHow: "Wizard" }).success).toBe(false);
    expect(profileEditSchema.safeParse({ workHow: "Solo builder" }).success).toBe(false); // old list
    expect(profileEditSchema.safeParse({ into: ["Knitting"] }).success).toBe(false);
    expect(profileEditSchema.safeParse({ past: [{ name: "X", year: 2024, status: "dead" }] }).success).toBe(false);
  });

  it("lets a past project leave out its year", () => {
    expect(profileEditSchema.parse({ past: [{ name: "X", status: "live" }] }).past[0].year).toBeNull();
  });

  it("treats every field as optional (an empty profile is valid)", () => {
    expect(profileEditSchema.parse({})).toMatchObject({ about: "", wantsToMeet: [], openTo: [], into: [], past: [] });
  });
});

describe("meetPhrase", () => {
  it("joins up to two choices for the chip", async () => {
    const { meetPhrase } = await import("./options");
    expect(meetPhrase(["Founders", "Designers"])).toBe("founders & designers");
    expect(meetPhrase([])).toBeNull();
  });
});
