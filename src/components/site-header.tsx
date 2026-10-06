import Link from "next/link";

import { AccountMenu } from "@/components/auth/account-menu";
import { NavLinks } from "@/components/shell/nav-links";
import styles from "@/components/shell/shell.module.css";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";

// V3 shell — DESIGN.md § Header (V3). Same on every route (root layout).
// Server Component; the client islands are the nav links (active-route pill),
// the theme toggle, the account menu (Sign in with X) and, on phones, the ☰
// menu (DESIGN.md § Mobile nav, 2026-10-06). The reference mock's search box
// is not rendered until search exists (UX rule 10).
export function SiteHeader() {
  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            underhyped<span>.wtf</span>
          </Link>
          <p>Talented people deserve more hype.</p>
        </div>
        <NavLinks />
        <div className={styles.tools}>
          <ThemeToggle />
          <Link href="/submit" className={styles.enter}>
            Enter the Arena
            <svg className={styles.arrow} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <AccountMenu />
          <MobileMenu />
        </div>
      </header>
    </div>
  );
}
