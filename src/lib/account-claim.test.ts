import { describe, expect, it } from "vitest";

import { chooseClaim, xVoterKey, xIdentityFromUser, type ClaimCandidate } from "./account-claim";

const harsh = { xUserId: "1543827190", xUsername: "HarshPatel502" };
const creator = (over: Partial<ClaimCandidate> = {}): ClaimCandidate => ({
  id: "c-1",
  username: "harshpatel502",
  xUserId: null,
  ...over,
});

describe("chooseClaim — only a matching X user id (DECISIONS.md § 2026-10-06)", () => {
  it("links the creator that carries this X user id", () => {
    expect(chooseClaim(harsh, creator({ xUserId: "1543827190" }))).toBe("c-1");
  });

  it("never claims by @handle: a creator with the same username but no X id stays unclaimed", () => {
    expect(chooseClaim(harsh, null)).toBeNull();
  });

  it("never claims a creator that carries a different X user id", () => {
    expect(chooseClaim(harsh, creator({ xUserId: "999" }))).toBeNull();
  });

  it("follows the id even after a rename (the handle no longer matches)", () => {
    expect(chooseClaim({ xUserId: "1543827190" }, creator({ id: "c-old", username: "harsh_old", xUserId: "1543827190" }))).toBe("c-old");
  });
});

describe("xIdentityFromUser", () => {
  it("reads id, handle, name and photo from the X identity", () => {
    const user = {
      user_metadata: { user_name: "harshpatel502", full_name: "Harsh", avatar_url: "https://pbs.twimg.com/a.jpg", provider_id: "1543827190" },
      identities: [{ provider: "x", id: "1543827190", identity_data: {} }],
    };
    expect(xIdentityFromUser(user)).toEqual({ xUserId: "1543827190", xUsername: "harshpatel502", xName: "Harsh", xAvatarUrl: "https://pbs.twimg.com/a.jpg" });
  });

  it("falls back to identity_data and strips a leading @", () => {
    const user = { identities: [{ provider: "x", identity_data: { sub: "42", preferred_username: "@maya_builds", name: "Maya" } }] };
    expect(xIdentityFromUser(user)).toMatchObject({ xUserId: "42", xUsername: "maya_builds", xName: "Maya", xAvatarUrl: null });
  });

  it("returns null when it is not an X sign-in", () => {
    expect(xIdentityFromUser({ user_metadata: { email: "a@b.co" }, identities: [{ provider: "google" }] })).toBeNull();
  });
});

describe("xVoterKey — RANKING.md § Scoring (2026-10-06)", () => {
  it("prefixes the X user id so it can never collide with a browser session uuid", () => {
    expect(xVoterKey("1543827190")).toBe("x:1543827190");
  });
});
