import { describe, it, expect } from "vitest";
import {
  shouldShowReceiptsNudge,
  RECEIPTS_NUDGE_AT,
  RECEIPTS_NUDGE_AGAIN_AT,
} from "./nudge";

describe("shouldShowReceiptsNudge", () => {
  it("shows nudge at 5 picks", () => {
    expect(shouldShowReceiptsNudge(5, false, null)).toBe(true);
  });

  it("hides nudge at 4 picks", () => {
    expect(shouldShowReceiptsNudge(4, false, null)).toBe(false);
  });

  it("hides nudge if signed in", () => {
    expect(shouldShowReceiptsNudge(5, true, null)).toBe(false);
  });

  it("shows again at 25 picks if dismissed at 5", () => {
    expect(shouldShowReceiptsNudge(25, false, 5)).toBe(true);
    expect(shouldShowReceiptsNudge(24, false, 5)).toBe(false);
  });

  it("hides if dismissed less than 20 picks ago", () => {
    expect(shouldShowReceiptsNudge(10, false, 5)).toBe(false);
    expect(shouldShowReceiptsNudge(25, false, 5)).toBe(true);
  });
});
