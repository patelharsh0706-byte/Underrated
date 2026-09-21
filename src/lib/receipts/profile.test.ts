// `server-only` throws unconditionally when actually run (see
// node_modules/server-only/index.js) — it only no-ops under the "react-server"
// export condition, which vitest's plain Node environment does not apply. The
// module under test, and its own dependencies (db/queries, session,
// supabase/server), all start with `import "server-only"`, so it has to be
// stubbed before any of them load.
vi.mock("server-only", () => ({}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

import { ensureProfile, getProfileByUserId, linkPickerSession } from "@/lib/db/queries";
import { getOrCreateVoterSession, readVoterSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, getOrCreateProfile, profileInputFromUser } from "./profile";

vi.mock("@/lib/db/queries", () => ({
  ensureProfile: vi.fn(),
  getProfileByUserId: vi.fn(),
  linkPickerSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getOrCreateVoterSession: vi.fn(),
  readVoterSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockEnsureProfile = vi.mocked(ensureProfile);
const mockGetProfileByUserId = vi.mocked(getProfileByUserId);
const mockLinkPickerSession = vi.mocked(linkPickerSession);
const mockGetOrCreateVoterSession = vi.mocked(getOrCreateVoterSession);
const mockReadVoterSession = vi.mocked(readVoterSession);
const mockCreateClient = vi.mocked(createClient);

const fakeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-1",
    email: "harsh@example.com",
    user_metadata: {},
    ...overrides,
  }) as User;

const fakeProfile = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  username: "harsh",
  displayName: null,
  avatarUrl: null,
  email: "harsh@example.com",
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

// TS infers getProfileByUserId/ensureProfile's static return type without the
// `| null` their bodies actually produce at runtime (`row ?? null`, and the
// concurrent-insert readback) — a pre-existing inference quirk in
// db/queries.ts, not something to paper over by loosening the real
// functions' signatures. These two casts let the tests express the miss case
// both functions genuinely hit in production.
const noExistingProfile = null as unknown as Awaited<ReturnType<typeof getProfileByUserId>>;
const noCreatedProfile = null as unknown as Awaited<ReturnType<typeof ensureProfile>>;

/** A minimal stand-in for the Supabase server client, just the surface finishSignIn touches. */
const fakeSupabase = (user: User | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user } }),
  },
}) as unknown as Awaited<ReturnType<typeof createClient>>;

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): a prior test's mockRejectedValue on
  // e.g. linkPickerSession must not leak into the next test — clear only
  // wipes call history, it leaves the implementation in place.
  vi.resetAllMocks();
  // Silence the module's own error logging so test output stays readable —
  // several scenarios below deliberately exercise the catch paths.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("profileInputFromUser", () => {
  it("prefers full_name over name for displayName", () => {
    const user = fakeUser({ user_metadata: { full_name: "Harsh Patel", name: "hp" } });
    expect(profileInputFromUser(user).displayName).toBe("Harsh Patel");
  });

  it("falls back to name when full_name is absent", () => {
    const user = fakeUser({ user_metadata: { name: "hp" } });
    expect(profileInputFromUser(user).displayName).toBe("hp");
  });

  it("defaults displayName and avatarUrl to null, email to empty string", () => {
    const user = fakeUser({ email: undefined, user_metadata: {} });
    const input = profileInputFromUser(user);
    expect(input).toEqual({
      userId: "user-1",
      email: "",
      displayName: null,
      avatarUrl: null,
    });
  });
});

describe("getOrCreateProfile", () => {
  it("fast path: returns the existing profile via one select, never calls getUser()", async () => {
    const profile = fakeProfile();
    mockGetProfileByUserId.mockResolvedValue(profile);

    const result = await getOrCreateProfile("user-1");

    expect(result).toEqual(profile);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockEnsureProfile).not.toHaveBeenCalled();
  });

  it("miss path: creates the profile and links the voter session when getUser() resolves the same user", async () => {
    mockGetProfileByUserId.mockResolvedValue(noExistingProfile);
    mockCreateClient.mockResolvedValue(fakeSupabase(fakeUser()));
    const created = fakeProfile();
    mockEnsureProfile.mockResolvedValue(created);
    mockReadVoterSession.mockResolvedValue("voter-session-1");

    const result = await getOrCreateProfile("user-1");

    expect(mockEnsureProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", email: "harsh@example.com" }),
    );
    expect(mockLinkPickerSession).toHaveBeenCalledWith("voter-session-1", "user-1");
    expect(result).toEqual(created);
  });

  it("miss path with no existing voter session: still creates the profile, does not link", async () => {
    mockGetProfileByUserId.mockResolvedValue(noExistingProfile);
    mockCreateClient.mockResolvedValue(fakeSupabase(fakeUser()));
    mockEnsureProfile.mockResolvedValue(fakeProfile());
    mockReadVoterSession.mockResolvedValue(null);

    await getOrCreateProfile("user-1");

    expect(mockLinkPickerSession).not.toHaveBeenCalled();
  });

  it("fails closed when getUser() returns no user, and logs the failure", async () => {
    mockGetProfileByUserId.mockResolvedValue(noExistingProfile);
    mockCreateClient.mockResolvedValue(fakeSupabase(null));

    const result = await getOrCreateProfile("user-1");

    expect(result).toBeNull();
    expect(mockEnsureProfile).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("fails closed when getUser() resolves a DIFFERENT user than the one requested", async () => {
    // Guards against attributing a self-heal to the wrong signed-in identity.
    mockGetProfileByUserId.mockResolvedValue(noExistingProfile);
    mockCreateClient.mockResolvedValue(fakeSupabase(fakeUser({ id: "someone-else" })));

    const result = await getOrCreateProfile("user-1");

    expect(result).toBeNull();
    expect(mockEnsureProfile).not.toHaveBeenCalled();
  });

  it("fails closed when ensureProfile throws on the miss path, and logs the failure", async () => {
    mockGetProfileByUserId.mockResolvedValue(noExistingProfile);
    mockCreateClient.mockResolvedValue(fakeSupabase(fakeUser()));
    mockEnsureProfile.mockRejectedValue(new Error("insert failed"));

    const result = await getOrCreateProfile("user-1");

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("finishSignIn", () => {
  it("returns `next` unchanged when getUser() returns no user (nothing to set up)", async () => {
    const destination = await finishSignIn(fakeSupabase(null), "/c/someone");
    expect(destination).toBe("/c/someone");
    expect(mockEnsureProfile).not.toHaveBeenCalled();
  });

  // The exact original regression, ISSUES.md § 2026-09-21 mechanism 2: one
  // catch around the whole callback route used to redirect to
  // /sign-in?error=auth even though exchangeCodeForSession had already
  // succeeded and the session cookies were set. finishSignIn must never
  // throw, and must still return a real destination, when the post-exchange
  // work (profile creation or session linking) fails.
  it("does not throw and still returns a destination when post-exchange work fails", async () => {
    mockEnsureProfile.mockRejectedValue(new Error("db unavailable"));
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");

    const destination = await finishSignIn(fakeSupabase(fakeUser()), null);

    expect(destination).toBe("/receipts");
    expect(console.error).toHaveBeenCalled();
  });

  it("does not throw when linkPickerSession fails after a successful ensureProfile", async () => {
    mockEnsureProfile.mockResolvedValue(fakeProfile());
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");
    mockLinkPickerSession.mockRejectedValue(new Error("link failed"));

    const destination = await finishSignIn(fakeSupabase(fakeUser()), "/c/someone");

    expect(destination).toBe("/c/someone");
    expect(console.error).toHaveBeenCalled();
  });

  it("returns `next` regardless of whether a profile was created", async () => {
    mockEnsureProfile.mockResolvedValue(fakeProfile());
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");

    const destination = await finishSignIn(fakeSupabase(fakeUser()), "/c/someone");

    expect(destination).toBe("/c/someone");
  });

  it("returns /<username>/receipts when no `next` and a profile was created", async () => {
    mockEnsureProfile.mockResolvedValue(fakeProfile({ username: "harsh" }));
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");

    const destination = await finishSignIn(fakeSupabase(fakeUser()), null);

    expect(destination).toBe("/harsh/receipts");
  });

  it("falls back to /receipts when no `next` and no profile could be resolved", async () => {
    mockEnsureProfile.mockResolvedValue(noCreatedProfile);
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");

    const destination = await finishSignIn(fakeSupabase(fakeUser()), null);

    expect(destination).toBe("/receipts");
  });

  it("links the voter session for the signed-in user", async () => {
    mockEnsureProfile.mockResolvedValue(fakeProfile());
    mockGetOrCreateVoterSession.mockResolvedValue("voter-session-1");

    await finishSignIn(fakeSupabase(fakeUser({ id: "user-1" })), null);

    expect(mockLinkPickerSession).toHaveBeenCalledWith("voter-session-1", "user-1");
  });
});
