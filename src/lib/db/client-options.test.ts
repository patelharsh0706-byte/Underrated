import { describe, expect, it } from "vitest";

import { DB_CLIENT_OPTIONS, DB_MAX_PIPELINE } from "./client-options";

// Regression guard for ISSUES.md § 2026-09-12 "Every pick failed silently".
// These are not style preferences: each value below, if changed, breaks the
// app at runtime in a way no type check or render test would catch.
describe("database client options", () => {
  it("pipelines at least one statement, so transactions can reserve a connection", () => {
    // At 0, postgres.js short-circuits before calling `onexecute`, the
    // connection is never marked reserved, and every sql.begin() dies with
    // UNSAFE_TRANSACTION — which silently disabled every Aura update in
    // production for a day. Voting is transactional by mandate (AGENTS.md),
    // so this value decides whether the core loop scores at all.
    expect(DB_MAX_PIPELINE).toBeGreaterThanOrEqual(1);
  });

  it("keeps prepared statements off for the transaction-mode pooler", () => {
    // Supavisor on 6543 cannot hold named statements across a handoff.
    expect(DB_CLIENT_OPTIONS.prepare).toBe(false);
  });

  it("drops and recycles sockets a frozen function may be holding", () => {
    // Both must stay set, or a thawed function writes into a dead socket and
    // the request hangs on TCP rather than the database.
    expect(DB_CLIENT_OPTIONS.idle_timeout).toBeGreaterThan(0);
    expect(DB_CLIENT_OPTIONS.max_lifetime).toBeGreaterThan(0);
    expect(DB_CLIENT_OPTIONS.connect_timeout).toBeGreaterThan(0);
  });
});
