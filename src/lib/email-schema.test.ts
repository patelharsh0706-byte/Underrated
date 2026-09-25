import { describe, expect, it } from "vitest";

import { subscribeEmailSchema } from "./email-schema";

describe("subscribeEmailSchema", () => {
  it("trims and lower-cases the address so one person is one row", () => {
    const r = subscribeEmailSchema.parse({ email: "  Harsh@Example.COM ", source: "drop" });
    expect(r.email).toBe("harsh@example.com");
  });

  it("rejects something that is not an email", () => {
    expect(subscribeEmailSchema.safeParse({ email: "harsh@", source: "footer" }).success).toBe(false);
  });

  it("only accepts the two known sources", () => {
    expect(subscribeEmailSchema.safeParse({ email: "a@b.co", source: "popup" }).success).toBe(false);
  });
});
