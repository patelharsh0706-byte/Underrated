import { describe, expect, it } from "vitest";

import { uniqueViolation } from "./unique-violation";

describe("uniqueViolation", () => {
  it("names the index from Postgres's own error", () => {
    expect(uniqueViolation({ code: "23505", constraint_name: "creators_username_key" })).toBe("creators_username_key");
  });

  it("finds it under Drizzle's wrapper", () => {
    const wrapped = new Error("Failed query", { cause: { code: "23505", constraint_name: "creators_x_user_id_key" } });
    expect(uniqueViolation(wrapped)).toBe("creators_x_user_id_key");
  });

  it("is null for any other failure", () => {
    expect(uniqueViolation(new Error("connection reset"))).toBeNull();
    expect(uniqueViolation({ code: "23503", constraint_name: "fk" })).toBeNull();
    expect(uniqueViolation(null)).toBeNull();
  });
});
