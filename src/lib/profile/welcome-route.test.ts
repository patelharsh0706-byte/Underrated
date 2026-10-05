import { describe, expect, it } from "vitest";

import { finishedWelcomeHref, hasFinishedOnboarding } from "./welcome-route";

describe("hasFinishedOnboarding", () => {
  const at = new Date("2026-10-06");
  it("needs both a profile and the steps done", () => {
    expect(hasFinishedOnboarding({ creatorId: "c1", onboardedAt: at })).toBe(true);
    // A claimed creator who never did the steps still sees them (gap 2, kept).
    expect(hasFinishedOnboarding({ creatorId: "c1", onboardedAt: null })).toBe(false);
    expect(hasFinishedOnboarding({ creatorId: null, onboardedAt: at })).toBe(false);
  });
});

describe("finishedWelcomeHref", () => {
  it("opens the profile by default", () => {
    expect(finishedWelcomeHref("/arena", "harshpatel502")).toBe("/c/harshpatel502");
  });
  it("continues to a waiting vote or to Arena entry / demo submit", () => {
    expect(finishedWelcomeHref("/arena?resume=1", "h")).toBe("/arena?resume=1");
    expect(finishedWelcomeHref("/submit", "h")).toBe("/submit");
    expect(finishedWelcomeHref("/demos/submit", "h")).toBe("/demos/submit");
  });
});
