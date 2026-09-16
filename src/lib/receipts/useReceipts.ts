"use client";

import { useCallback, useEffect, useState } from "react";
import { shouldShowReceiptsNudge } from "./nudge";

const NUDGE_COOKIE_NAME = "underhyped_receipts_nudge";

export function useReceiptsNudge(sessionPicks: number, isSignedIn: boolean) {
  const [showNudge, setShowNudge] = useState(false);
  const [dismissedAtPicks, setDismissedAtPicks] = useState<number | null>(null);

  useEffect(() => {
    // Read dismissal cookie only in effect (avoid hydration mismatch)
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${NUDGE_COOKIE_NAME}=`));
    if (cookie) {
      const value = parseInt(cookie.split("=")[1], 10);
      if (!isNaN(value)) {
        setDismissedAtPicks(value);
      }
    }
  }, []);

  useEffect(() => {
    const should = shouldShowReceiptsNudge(sessionPicks, isSignedIn, dismissedAtPicks);
    setShowNudge(should);
  }, [sessionPicks, isSignedIn, dismissedAtPicks]);

  const dismissNudge = useCallback(() => {
    document.cookie = `${NUDGE_COOKIE_NAME}=${sessionPicks}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setDismissedAtPicks(sessionPicks);
    setShowNudge(false);
  }, [sessionPicks]);

  return { showNudge, dismissNudge };
}
