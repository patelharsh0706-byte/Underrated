"use client";

import { useLayoutEffect } from "react";

import styles from "./shell.module.css";
import { THEME_KEY } from "./theme-script";

// Day/night switch — DESIGN.md § Night theme. The inline script in
// layout.tsx applies a saved choice before first paint; with no saved
// choice the CSS follows the OS. This island only flips the attribute and
// remembers it. Which icon shows is pure CSS (--icon-sun / --icon-moon), so
// server and client render the same markup and nothing flashes.
function currentTheme(): "dark" | "light" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "dark" || set === "light") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  // Re-apply after React's dev-mode remount clears the attribute the inline
  // script set. A no-op in production.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") {
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {
      // storage blocked — the OS preference still applies via CSS
    }
  }, []);

  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage blocked — the switch still works for this page view
    }
  }

  return (
    <button type="button" className={styles.theme} onClick={toggle} aria-label="Switch day or night mode" title="Day / night">
      <svg className={styles.moon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <svg className={styles.sun} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
