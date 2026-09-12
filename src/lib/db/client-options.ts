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
 * - prepare: false   — transaction-mode poolers cannot hold named statements.
 * - max_pipeline: 1  — never queue a second statement behind an in-flight one
 *                      on the same socket; the pooler may hand the backend off
 *                      between them. Must be 1, not 0: postgres.js gates the
 *                      `onexecute` callback behind `sent.length < max_pipeline`
 *                      (src/connection.js), and `onexecute` is what marks the
 *                      connection reserved for `sql.begin`. At 0 that callback
 *                      never fires, so every transaction dies on the COMMIT of
 *                      its BEGIN with UNSAFE_TRANSACTION — which took Aura
 *                      updates with it. See DECISIONS.md § 2026-09-12.
 * - idle_timeout     — drop sockets the function is not using, so a frozen
 *                      instance does not wake up holding connections the
 *                      pooler has already closed underneath it.
 * - max_lifetime     — recycle every socket regularly for the same reason.
 * - connect_timeout  — fail a dead handshake in seconds, not Vercel's 300 s.
 */
export const DB_CLIENT_OPTIONS = {
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
  // Read at runtime (postgres/src/index.js `ints`) but missing from 3.4's typings.
  ...({ max_pipeline: 1 } as Partial<postgres.Options<Record<string, never>>>),
} satisfies postgres.Options<Record<string, never>>;

/** The `max_pipeline` actually handed to postgres(), for the assertion in the
 *  test — it is spread in above to work around the missing typing. */
export const DB_MAX_PIPELINE: number = (
  DB_CLIENT_OPTIONS as unknown as { max_pipeline: number }
).max_pipeline;
