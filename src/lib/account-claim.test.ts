import { describe, expect, it } from "vitest";

import { accountVoterKey, chooseClaim, xIdentityFromUser, type ClaimCandidate } from "./account-claim";

const harsh = { xUserId: "1543827190", xUsername: "HarshPatel502" };
const creator = (over: Partial<ClaimCandidate> = {}): ClaimCandidate => ({
  id: "c-1",
  username: "harshpatel502",
  userId: null,
  xUserId: null,
  ...over,
});

describe("chooseClaim — DATABASE.md § accounts", () => {
  it("links the creator that already carries this X user id", () => {
    expect(chooseClaim(harsh, creator({ xUserId: "1543827190", userId: "u-1" }), null)).toEqual({ creatorId: "c-1", saveXUserId: false });
  });

  it("claims an unclaimed creator by @handle once, case-insensitive, and saves the id", () => {
    expect(chooseClaim(harsh, null, creator())).toEqual({ creatorId: "c-1", saveXUserId: true });
  });

  it("never takes over a claimed creator through a handle match", () => {
    expect(chooseClaim(harsh, null, creator({ userId: "someone-else" }))).toBeNull();
    expect(chooseClaim(harsh, null, creator({ xUserId: "999" }))).toBeNull();
  });

  it("returns none for a new person", () => {
    expect(chooseClaim(harsh, null, null)).toBeNull();
    expect(chooseClaim(harsh, null, creator({ username: "someoneelse" }))).toBeNull();
  });

  it("prefers the id match even if the handle now points elsewhere (renamed account)", () => {
    const byId = creator({ id: "c-old", username: "harsh_old", xUserId: "1543827190", userId: "u-1" });
    expect(chooseClaim(harsh, byId, creator({ id: "c-other" }))?.creatorId).toBe("c-old");
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

describe("accountVoterKey", () => {
  it("prefixes the account id so it can never collide with a browser session uuid", () => {
    expect(accountVoterKey("abc")).toBe("u:abc");
  });
});
