import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

// Tuned for a serverless function talking to Supavisor in transaction mode
// (port 6543). See DECISIONS.md § 2026-09-11 "The database client is
// configured for a frozen function, not a long-lived server".
//
// - prepare: false   — transaction-mode poolers cannot hold named statements.
// - max_pipeline: 0  — never queue a second statement behind an in-flight one
//                      on the same socket; the pooler may hand the backend off
//                      between them.
// - idle_timeout     — drop sockets the function is not using, so a frozen
//                      instance does not wake up holding connections the
//                      pooler has already closed underneath it.
// - max_lifetime     — recycle every socket regularly for the same reason.
// - connect_timeout  — fail a dead handshake in seconds, not Vercel's 300 s.
const connection =
  globalForDb.connection ??
  postgres(serverEnv().DATABASE_URL, {
    prepare: false,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    // Read at runtime (src/index.js `ints`) but missing from 3.4's typings.
    ...({ max_pipeline: 0 } as Partial<postgres.Options<Record<string, never>>>),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
