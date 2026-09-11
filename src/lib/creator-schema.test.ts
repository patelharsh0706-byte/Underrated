import { describe, expect, it } from "vitest";

import { checkoutInputSchema, creatorFieldsSchema, SUBMISSION_FEE_CENTS } from "./creator-schema";

/**
 * The submit action serializes its validated payload into Dodo checkout
 * metadata; the webhook JSON-parses that string and re-validates it with
 * creatorFieldsSchema before inserting the creator row. If that round trip
 * ever stops holding, the failure is silent and expensive — the payment
 * succeeds, the webhook rejects the metadata, and the creator is left on a
 * spinner with no row and no refund. These tests pin the round trip.
 */
const validSubmission = {
  name: "Harsh Patel",
  username: "harshpatel502",
  bio: "I help talented people find their place. Through underhyped.wtf",
  category: "Indie Developer",
  workUrl: "https://underhyped.wtf",
  socials: { twitter: "https://x.com/harshpatel502" },
  primarySocial: "twitter",
};

describe("checkout metadata round trip", () => {
  it("survives serialize -> parse -> re-validate", () => {
    const outbound = checkoutInputSchema.parse(validSubmission);
    const rehydrated = creatorFieldsSchema.safeParse(JSON.parse(JSON.stringify(outbound)));

    expect(rehydrated.success).toBe(true);
    // workUrl comes back normalized ("…wtf" -> "…wtf/"), so compare against
    // what the schema actually emitted rather than what was typed.
    expect(rehydrated.success && rehydrated.data).toMatchObject(outbound);
  });

  it("survives it for a bare-domain work URL, which the schema rewrites", () => {
    // workUrl is preprocessed (normalizeUrlInput prepends https://), so the
    // value written to metadata differs from the value typed. The rewritten
    // value has to validate too, or every bare domain breaks after payment.
    const outbound = checkoutInputSchema.parse({ ...validSubmission, workUrl: "underhyped.wtf" });

    expect(outbound.workUrl).toBe("https://underhyped.wtf/");
    expect(creatorFieldsSchema.safeParse(JSON.parse(JSON.stringify(outbound))).success).toBe(true);
  });

  it("survives it when the optional bio is absent", () => {
    const noBio = { ...validSubmission, bio: undefined };
    const outbound = checkoutInputSchema.parse(noBio);

    expect(creatorFieldsSchema.safeParse(JSON.parse(JSON.stringify(outbound))).success).toBe(true);
  });

  it("keeps a realistic payload well inside a provider metadata cap", () => {
    const outbound = checkoutInputSchema.parse({
      ...validSubmission,
      bio: "x".repeat(140),
      name: "y".repeat(80),
    });

    expect(JSON.stringify(outbound).length).toBeLessThan(900);
  });
});

describe("checkoutInputSchema", () => {
  it("rejects a primary social with no matching link", () => {
    const result = checkoutInputSchema.safeParse({ ...validSubmission, primarySocial: "github" });
    expect(result.success).toBe(false);
  });

  it("lowercases the username so the profile URL is stable", () => {
    const parsed = checkoutInputSchema.parse({ ...validSubmission, username: "HarshPatel502" });
    expect(parsed.username).toBe("harshpatel502");
  });

  it("never takes a price from the caller", () => {
    const parsed = checkoutInputSchema.parse({ ...validSubmission, amountCents: 1 });
    expect(parsed).not.toHaveProperty("amountCents");
    expect(SUBMISSION_FEE_CENTS).toBe(300);
  });
});
