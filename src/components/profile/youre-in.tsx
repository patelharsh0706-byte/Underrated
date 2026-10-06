"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { safeNext } from "@/lib/safe-next";

import { cx } from "./profile-view";

// The payoff: "⚡ You're in." for about 1.5 s, then the public profile — or
// straight back to the battle when a pick was waiting (DESIGN.md § Welcome v2).

const SAYS = { pick: "Your Hype now counts.", demo: "Your judgement now counts.", hype: "Your Hype now counts." } as const;

interface YoureInProps {
  to: string;
  pending: keyof typeof SAYS | null;
  /** Where they're headed next, when it isn't the profile (DECISIONS.md § 2026-10-06). */
  line?: string;
}

export function YoureIn({ to, pending, line }: YoureInProps) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push(safeNext(to)), 1500);
    return () => clearTimeout(t);
  }, [router, to]);

  return (
    <div className={cx("ob-in")} role="status">
      <h1>⚡ You’re in.</h1>
      <p>{pending ? SAYS[pending] : (line ?? "Opening your profile…")}</p>
    </div>
  );
}
