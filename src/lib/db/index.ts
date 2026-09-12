import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";
import { DB_CLIENT_OPTIONS } from "./client-options";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

// Every option, and why it is set, lives in ./client-options.ts.
const connection =
  globalForDb.connection ?? postgres(serverEnv().DATABASE_URL, DB_CLIENT_OPTIONS);

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
