import type postgres from "postgres";

/**
 * Tuned for a serverless function talking to Supavisor in transaction mode
 * (port 6543). See DECISIONS.md § 2026-09-11 "The database client is
 * configured for a frozen function, not a long-lived server".
 *
 * Kept in its own module, apart from the client that consumes it, purely so
 * the invariants below can be asserted without a database or a server-only
 * import — see client-options.test.ts and ISSUES.md § 2026-09-12.
 *
 * - prepare: false   — kept from the transaction-mode setup, where named
 *                      statements cannot survive a pooler handoff. Harmless in
 *                      session mode; revisit only with measurements.
 * - max: 4            — session mode (port 5432) gives each connection its own
 *                      backend, so its pool is smaller than transaction mode's.
 *                      Bound what one function instance can take so several
 *                      instances cannot exhaust it between them.
 * - max_pipeline      NOT SET. Both values it was ever given broke the app. At
 *                      0 every transaction died with UNSAFE_TRANSACTION —
 *                      postgres.js gates the `onexecute` callback behind
 *                      `sent.length < max_pipeline`, and that callback is what
 *                      reserves a connection for `sql.begin`, so no pick moved
 *                      Aura for a day. At 1 the protocol stream desynchronised
 *                      instead: parameters from one statement arrived in
 *                      another statement's Bind (`invalid input syntax for
 *                      type integer: "f"`, a boolean from a different query).
 *                      Do not set this option. See ISSUES.md § 2026-09-12.
 * - idle_timeout     — drop sockets the function is not using, so a frozen
 *                      instance does not wake up holding connections the
 *                      pooler has already closed underneath it.
 * - max_lifetime     — recycle every socket regularly for the same reason.
 * - connect_timeout  — fail a dead handshake in seconds, not Vercel's 300 s.
 */
export const DB_CLIENT_OPTIONS = {
  prepare: false,
  max: 4,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
} satisfies postgres.Options<Record<string, never>>;

/** `max_pipeline` if it is ever set again. Undefined — the library default — is
 *  what we want; see the note above and the test beside this file. */
export const DB_MAX_PIPELINE: number | undefined = (
  DB_CLIENT_OPTIONS as { max_pipeline?: number }
).max_pipeline;
