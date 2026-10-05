import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/avatar-store", () => ({ storeCreatorAvatar: vi.fn() }));

const { arenaEntryAction } = await import("./write");

describe("arenaEntryAction — DECISIONS.md § 2026-10-05 Onboarding v2", () => {
  it("switches on a free profile, creates one when none, ignores an Arena creator", () => {
    expect(arenaEntryAction({ profileOnly: true })).toBe("activate");
    expect(arenaEntryAction(null)).toBe("create");
    expect(arenaEntryAction({ profileOnly: false })).toBe("none");
  });
});
