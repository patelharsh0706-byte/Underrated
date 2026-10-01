import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Regression guard for ISSUES.md § 2026-10-01: on live demos "View product" is
// an <a>, which is inline unless told otherwise — it ignored its margin and
// overlapped the vote buttons. Sample mode renders a <button>, so it only
// showed on the real site.
const css = readFileSync(join(__dirname, "demos.module.css"), "utf8");

function block(selector: string): string {
  const start = css.search(new RegExp(`^\\.${selector}\\s*\\{`, "m"));
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("\n}", start));
}

describe("demos.module.css", () => {
  it("gives View product an explicit box display so it works as a link or a button", () => {
    expect(block("dmVisit")).toMatch(/display:\s*inline-(flex|block);/);
  });
});
