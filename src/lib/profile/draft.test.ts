import { describe, expect, it } from "vitest";

import { initialDraft, withProject } from "./draft";

describe("initialDraft — X bio bootstraps the profile once", () => {
  it("copies the X bio into tagline and About, and prefills location and project", () => {
    const d = initialDraft({ xBio: "building stuff | ex-whatever | dm open", xLocation: "🇮🇳 Bengaluru", xUrl: "https://shipnotes.app" });
    expect(d).toMatchObject({
      tagline: "building stuff | ex-whatever | dm open",
      about: "building stuff | ex-whatever | dm open",
      location: "🇮🇳 Bengaluru",
      projectUrl: "https://shipnotes.app",
      projectName: "shipnotes.app",
    });
  });

  it("trims to the limits (tagline 140, About 200, location 40)", () => {
    const d = initialDraft({ xBio: "x".repeat(300), xLocation: "y".repeat(60) });
    expect(d.tagline).toHaveLength(140);
    expect(d.about).toHaveLength(200);
    expect(d.location).toHaveLength(40);
  });

  it("is empty but valid when X shared nothing", () => {
    expect(initialDraft({})).toMatchObject({ tagline: "", about: "", location: "", projectUrl: "", projectName: "" });
  });
});

describe("withProject — Welcome's 'What are you building?'", () => {
  it("sets the link and names the project after its domain", () => {
    expect(withProject(initialDraft({}), "underhyped.wtf")).toMatchObject({ projectUrl: "https://underhyped.wtf", projectName: "underhyped.wtf" });
  });

  it("keeps a name the person already typed", () => {
    const d = { ...initialDraft({ xUrl: "https://a.com" }), projectName: "Shipnotes" };
    expect(withProject(d, "https://b.com").projectName).toBe("Shipnotes");
  });
});

describe("withProject — optional project (DECISIONS.md § 2026-10-05)", () => {
  it("clears the project when the link is left empty", () => {
    const d = withProject(initialDraft({ xUrl: "https://shipnotes.app" }), "");
    expect(d.projectUrl).toBe("");
    expect(d.projectName).toBe("");
  });
});
