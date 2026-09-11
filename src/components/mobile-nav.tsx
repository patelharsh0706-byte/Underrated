"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The only client island in the header — DESIGN.md § Components "Mobile nav",
// DECISIONS.md § 2026-09-11 "Mobile nav collapses into a dropdown". The panel
// is rendered in flow: the header is a wrapping flex row, so `order-3 w-full`
// drops it under the masthead and pushes the page down instead of covering it.
export type NavLink = { href: string; label: string };

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const Icon = open ? X : Menu;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-hairline focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none sm:hidden"
      >
        <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Site"
          className="nav-drop order-3 -mx-4 w-[calc(100%+2rem)] border-t border-b border-hairline px-4 py-3 sm:hidden"
        >
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block py-3 font-display text-[28px] leading-none font-extrabold tracking-[-0.03em] transition-colors focus-visible:outline-none focus-visible:underline ${
                  active ? "text-aura" : "text-foreground hover:text-ink-soft"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
