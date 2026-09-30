"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import s from "./demos.module.css";

const TABS = [
  { href: "/demos", label: "Judge" },
  { href: "/demos/top", label: "Top this week" },
  { href: "/demos/submit", label: "Submit yours" },
] as const;

/** Segmented sub-nav shared by the three Demos pages (DESIGN.md § Demos). */
export function DemosTabs({ center = false }: { center?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={`${s.dmTabs} ${center ? s.dmTabsCenter : ""}`} aria-label="Demos">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={pathname === t.href ? s.isOn : undefined} aria-current={pathname === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
