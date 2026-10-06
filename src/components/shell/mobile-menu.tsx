"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { SignInGate } from "@/components/auth/sign-in-gate";
import { useMe } from "@/components/auth/use-me";

import { isActive, LINKS } from "./nav-links";
import styles from "./shell.module.css";
import { ThemeToggle } from "./theme-toggle";

// Phones only (≤ 760px) — DESIGN.md § Mobile nav (2026-10-06). The bar keeps
// the lockup, "Enter the Arena" and the avatar; ☰ drops a panel *in flow*
// under the header (it pushes the page down, nothing is covered) with the
// nav, Sign in / My profile and the day-night switch. Hidden on wider screens.
export function MobileMenu() {
  const pathname = usePathname();
  const { me, myUsername } = useMe();
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);

  // Close on navigation — React's "adjust state when a prop changes" pattern.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.burger}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open ? (
        <div id="mobile-menu" className={styles.panel}>
          <nav aria-label="Main">
            {LINKS.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={isActive(href, pathname) ? "page" : undefined} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.panelRow}>
            {me === undefined ? (
              <span />
            ) : me ? (
              <div className={styles.panelAccount}>
                <Link href={myUsername ? `/c/${myUsername}` : "/welcome"} className={styles.panelBtn} onClick={() => setOpen(false)}>
                  My profile
                </Link>
                <form action={signOut}>
                  <button type="submit" className={styles.panelText}>
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <button type="button" className={styles.panelBtn} onClick={() => setGate(true)}>
                Sign in with X
              </button>
            )}
            <div className={styles.panelTheme}>
              <span>Day / night</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}

      {gate ? <SignInGate variant="signin" next={window.location.pathname + window.location.search} onClose={() => setGate(false)} /> : null}
    </>
  );
}
