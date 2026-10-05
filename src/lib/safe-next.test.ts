import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["/\\/evil.com"],
    ["https://evil.com"],
    ["evil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["javascript:alert(1)"],
    [""],
  ])("rejects %j", (raw) => {
    expect(safeNext(raw)).toBe("/arena");
  });

  it("rejects a missing value", () => {
    expect(safeNext(null)).toBe("/arena");
    expect(safeNext(undefined, "/")).toBe("/");
  });

  it.each([["/arena"], ["/arena?resume=1"], ["/c/maya_builds"], ["/demos/submit"], ["/welcome?next=%2Fsubmit"]])("allows %j", (raw) => {
    expect(safeNext(raw)).toBe(raw);
  });

  it("keeps an encoded backslash as a harmless path", () => {
    expect(safeNext("/%5Cevil.com")).toBe("/%5Cevil.com");
  });
});
