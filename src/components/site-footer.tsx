import Link from "next/link";

import { EmailSignupForm } from "@/components/email-signup-form";
import styles from "@/components/shell/shell.module.css";

// V3 shell — DESIGN.md § Footer (V3). Same on every route (root layout).
// Social icons appear only for accounts that exist (UX rule 10) — X today.
const COPYRIGHT = "© 2026 Underhyped. All rights reserved.";

export function SiteFooter() {
  return (
    <div className={styles.wrap}>
      <footer className={styles.foot}>
        <div className={styles.footBrand}>
          <Link href="/" className={styles.logo}>
            underhyped<span>.wtf</span>
          </Link>
          <p className={styles.tag}>Talented people deserve more hype.</p>
          <div className={styles.social}>
            <a className={styles.soc} href="https://x.com/HarshPatel502" target="_blank" rel="noopener noreferrer" aria-label="Underhyped on X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
              </svg>
            </a>
          </div>
          <p className={styles.copy}>{COPYRIGHT}</p>
        </div>

        <nav className={styles.cols} aria-label="Footer">
          <div className={styles.col}>
            <h3>Explore</h3>
            <Link href="/arena">Arena</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/nominate">Nominate</Link>
            <Link href="/">Discover</Link>
          </div>
          <div className={styles.col}>
            <h3>Learn</h3>
            <Link href="/about">About</Link>
            <Link href="/rules">Arena Rules</Link>
          </div>
          <div className={styles.col}>
            <h3>Legal</h3>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/rules">Community Guidelines</Link>
          </div>
        </nav>

        <div className={styles.news}>
          <h3>Get the latest</h3>
          <p>New features, top creators, and community updates.</p>
          <EmailSignupForm source="footer" />
          <p className={styles.copyMobile}>{COPYRIGHT}</p>
        </div>
      </footer>
    </div>
  );
}
