"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./shell.module.css";

// The header's active-route pill needs the pathname, so the links are a
// small client island and the rest of SiteHeader stays a Server Component
// (DECISIONS.md § 2026-09-11 on keeping the header server-rendered).
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/arena", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/nominate", label: "Nominate" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
