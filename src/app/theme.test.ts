import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Regression guard for ISSUES.md § 2026-09-26: phones opened the day site in
// dark because the page stopped declaring a colour scheme, so mobile
// browsers darkened it themselves.
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

/** The first bare `:root { … }` block — the day theme. */
function dayRootBlock(source: string): string {
  const start = source.search(/^:root\s*\{/m);
  expect(start).toBeGreaterThanOrEqual(0);
  return source.slice(start, source.indexOf("\n}", start));
}

describe("day is the default theme", () => {
  it("declares the day theme light-only so mobile auto-dark leaves it alone", () => {
    expect(dayRootBlock(css)).toMatch(/color-scheme:\s*only light;/);
  });

  it("does not follow the OS dark setting", () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
  });

  it("switches to dark only through the toggle's data-theme", () => {
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark;/);
  });
});
