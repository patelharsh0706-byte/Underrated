import { describe, expect, it } from "vitest";

import { continuesAfterProfile, entryStateFrom, onboardingFor } from "./entry-gate";

describe("entryStateFrom", () => {
  it("treats no account row as signed out, so /welcome never bounces back", () => {
    expect(entryStateFrom(null, null)).toEqual({ kind: "signed-out" });
  });

  it("sends an account without a creator to onboarding", () => {
    expect(entryStateFrom({ creatorId: null, email: "a@b.co", xUsername: "maya" }, null)).toEqual({ kind: "needs-profile" });
  });

  it("sends an account whose creator row is gone to onboarding", () => {
    expect(entryStateFrom({ creatorId: "c1", email: null, xUsername: "maya" }, null)).toEqual({ kind: "needs-profile" });
  });

  it("offers the $3 entry to a free profile", () => {
    expect(entryStateFrom({ creatorId: "c1", email: "a@b.co", xUsername: "Maya" }, { username: "maya", profileOnly: true, workUrl: "https://ship.app" })).toEqual({
      kind: "profile-only",
      username: "maya",
      email: "a@b.co",
      handle: "Maya",
      projectUrl: "https://ship.app",
    });
  });

  it("recognises someone already in the Arena", () => {
    expect(entryStateFrom({ creatorId: "c1", email: null, xUsername: "maya" }, { username: "maya", profileOnly: false, workUrl: null })).toEqual({
      kind: "in-arena",
      username: "maya",
      email: "",
      handle: "maya",
      projectUrl: "",
    });
  });
});

describe("continuesAfterProfile", () => {
  it("continues to the Arena entry and the demo form", () => {
    expect(continuesAfterProfile("/submit")).toBe(true);
    expect(continuesAfterProfile("/demos/submit")).toBe(true);
    expect(continuesAfterProfile("/demos/submit?x=1")).toBe(true);
  });

  it("opens the profile for anything else", () => {
    expect(continuesAfterProfile("/arena")).toBe(false);
    expect(continuesAfterProfile("/arena?resume=1")).toBe(false);
    expect(continuesAfterProfile("/submit/success")).toBe(false);
  });
});

describe("onboardingFor", () => {
  it("carries the page through /welcome", () => {
    expect(onboardingFor("/demos/submit")).toBe("/welcome?next=%2Fdemos%2Fsubmit");
  });
});
