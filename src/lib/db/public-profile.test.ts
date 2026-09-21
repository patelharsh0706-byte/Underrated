import { describe, expect, it } from "vitest";

import type { PublicProfile } from "./queries";

// Regression guard for ISSUES.md § 2026-09-21: `profiles.email` must never
// reach a page. The public receipts route reads PublicProfile only, so the
// guarantee is the shape of that type — checked here at compile time. If a
// future edit adds `email` to the projection, this file stops typechecking.
type HasEmail = "email" extends keyof PublicProfile ? true : false;
const publicProfileHasNoEmail: HasEmail extends false ? true : never = true;

describe("PublicProfile", () => {
  it("does not carry the login email", () => {
    expect(publicProfileHasNoEmail).toBe(true);
  });
});
