"use client";

import { useCallback, useState } from "react";
import { shouldShowReceiptsNudge } from "./nudge";

const NUDGE_COOKIE_NAME = "underhyped_receipts_nudge";

function readDismissalCookie(): number | null {
  if (typeof window === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${NUDGE_COOKIE_NAME}=`));
  if (!cookie) return null;
  const value = parseInt(cookie.split("=")[1], 10);
  return isNaN(value) ? null : value;
}

export function useReceiptsNudge(sessionPicks: number, isSignedIn: boolean) {
  // Lazy initializer: reads cookie once on client mount, returns null on SSR.
  const [dismissedAtPicks, setDismissedAtPicks] = useState<number | null>(readDismissalCookie);

  // Derived — not stored in state to avoid a cascading setState-in-effect.
  const showNudge = shouldShowReceiptsNudge(sessionPicks, isSignedIn, dismissedAtPicks);

  const dismissNudge = useCallback(() => {
    document.cookie = `${NUDGE_COOKIE_NAME}=${sessionPicks}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setDismissedAtPicks(sessionPicks);
  }, [sessionPicks]);

  return { showNudge, dismissNudge };
}
