import { describe, expect, it } from "vitest";

import { DB_CLIENT_OPTIONS, DB_MAX_PIPELINE } from "./client-options";

// Regression guard for ISSUES.md § 2026-09-12 "Every pick failed silently".
// These are not style preferences: each value below, if changed, breaks the
// app at runtime in a way no type check or render test would catch.
describe("database client options", () => {
  it("leaves max_pipeline at the library default", () => {
    // Both values this was ever given broke the app, in different ways:
    //   0 — every sql.begin() died with UNSAFE_TRANSACTION, because the
    //       `onexecute` callback that reserves the connection is gated behind
    //       `sent.length < max_pipeline`. No pick moved Aura for a day.
    //   1 — the protocol stream desynchronised: parameters from one statement
    //       turned up in another statement's Bind.
    // Voting is transactional by mandate (AGENTS.md), so this option decides
    // whether the core loop scores at all. Leave it unset.
    expect(DB_MAX_PIPELINE).toBeUndefined();
  });

  it("bounds how many connections one instance can take", () => {
    // Session mode gives each connection its own backend, so the pool is
    // smaller than transaction mode's and several function instances could
    // exhaust it between them.
    expect(DB_CLIENT_OPTIONS.max).toBeGreaterThan(0);
    expect(DB_CLIENT_OPTIONS.max).toBeLessThanOrEqual(6);
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
