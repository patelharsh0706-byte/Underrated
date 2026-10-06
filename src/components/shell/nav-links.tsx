"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./shell.module.css";

// The header's active-route pill needs the pathname, so the links are a
// small client island and the rest of SiteHeader stays a Server Component
// (DECISIONS.md § 2026-09-11 on keeping the header server-rendered).
export const LINKS = [
  { href: "/", label: "Home" },
  { href: "/arena", label: "Arena" },
  { href: "/demos", label: "Demos" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/nominate", label: "Nominate" },
] as const;

/** True when `href` is the current page (Demos stays lit on its sub-pages). */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      {LINKS.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
