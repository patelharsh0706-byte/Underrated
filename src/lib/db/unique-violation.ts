// Which unique index an insert broke, or null when it failed for another
// reason. Drizzle wraps the driver's error, so walk the `cause` chain until
// Postgres's own error (code 23505, with `constraint_name`) turns up.

const UNIQUE_VIOLATION = "23505";

export function uniqueViolation(err: unknown): string | null {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e && typeof e === "object"; depth++) {
    const pg = e as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (pg.code === UNIQUE_VIOLATION) return typeof pg.constraint_name === "string" ? pg.constraint_name : "";
    e = pg.cause;
  }
  return null;
}
