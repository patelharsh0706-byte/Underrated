import { describe, expect, it } from "vitest";

import { clickDemoSchema, createDemoSchema, isOurDemoBlob, judgeDemoSchema } from "./schemas";

const valid = {
  productName: "MetricShots",
  tagline: "Turn numbers into social milestone cards.",
  productUrl: "metricshots.app",
  category: "Creator tools",
  contactEmail: "  Harsh@Example.COM ",
  videoUrl: "https://abc.public.blob.vercel-storage.com/demos/x.mp4",
  videoBytes: 2_000_000,
  videoWidth: 1280,
  videoHeight: 720,
  durationMs: 14_200,
};

describe("createDemoSchema", () => {
  it("normalizes the URL to https and lower-cases the email", () => {
    const r = createDemoSchema.parse(valid);
    expect(r.productUrl).toBe("https://metricshots.app");
    expect(r.contactEmail).toBe("harsh@example.com");
  });
  it("rejects files over 8 MB and clips over 15.5 s", () => {
    expect(createDemoSchema.safeParse({ ...valid, videoBytes: 8 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(createDemoSchema.safeParse({ ...valid, durationMs: 16_000 }).success).toBe(false);
  });
  it("only accepts the four categories", () => {
    expect(createDemoSchema.safeParse({ ...valid, category: "Crypto" }).success).toBe(false);
  });
  it("rejects a URL without a dot", () => {
    expect(createDemoSchema.safeParse({ ...valid, productUrl: "localhost" }).success).toBe(false);
  });
});

describe("judge and click schemas", () => {
  it("need a real demo id and a known verdict", () => {
    const id = "0b66e7c3-5a18-41a7-8b3d-0c77e69df3bd";
    expect(judgeDemoSchema.safeParse({ demoId: id, verdict: "underhyped" }).success).toBe(true);
    expect(judgeDemoSchema.safeParse({ demoId: id, verdict: "meh" }).success).toBe(false);
    expect(clickDemoSchema.safeParse({ demoId: "nope" }).success).toBe(false);
  });
});

describe("isOurDemoBlob", () => {
  it("accepts our public Blob demos folder only", () => {
    expect(isOurDemoBlob("https://abc.public.blob.vercel-storage.com/demos/x.mp4")).toBe(true);
    expect(isOurDemoBlob("https://abc.public.blob.vercel-storage.com/avatars/x.jpg")).toBe(false);
    expect(isOurDemoBlob("https://evil.example.com/demos/x.mp4")).toBe(false);
    expect(isOurDemoBlob("not a url")).toBe(false);
  });
});
