import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";
import { clientOptionsFor } from "./client-options";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

type Db = PostgresJsDatabase<typeof schema>;
let instance: Db | null = null;

// The connection is created on first use, not when this file is imported.
// Importing must not need DATABASE_URL: a secret-free CI build (PREVIEW_MOCK=1)
// loads every route's modules to collect page config, and the old eager
// version crashed it on any route that merely imported the client
// (DECISIONS.md § 2026-10-01 "CI on GitHub Actions"). Behaviour at request
// time is unchanged — the first query connects exactly as before.
function getDb(): Db {
  if (instance) return instance;
  // Every option, and why it is set, lives in ./client-options.ts.
  const connection = globalForDb.connection ?? postgres(serverEnv().DATABASE_URL, clientOptionsFor(serverEnv().DATABASE_URL));
  if (process.env.NODE_ENV !== "production") {
    globalForDb.connection = connection;
  }
  instance = drizzle(connection, { schema });
  return instance;
}

/** The app's database. Same API as before; connects lazily on first use. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
