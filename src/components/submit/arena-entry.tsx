"use client";

import { useState } from "react";

import { startArenaCheckout } from "@/app/actions/onboarding";
import s from "@/components/profile/profile.module.css";

// /submit once the profile is finished: the same $3 card as on your own
// profile (DECISIONS.md § 2026-10-06).

export function ArenaEntry() {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterArena() {
    setPaying(true);
    setError(null);
    const r = await startArenaCheckout();
    if (r.payUrl) return window.location.assign(r.payUrl);
    setPaying(false);
    setError(r.error ?? "Couldn’t start checkout — try again in a minute.");
  }

  return (
    <div className={s.root}>
      <div className={s["ob-arena"]}>
        <p>
          <b>Think you’re underhyped?</b> Enter the Arena and find out.
        </p>
        <button className={s["px-lime"]} type="button" disabled={paying} onClick={() => void enterArena()}>
          {paying ? "Opening checkout…" : "Enter the Arena →"}
        </button>
        <small>$3 once. Battles, Aura and a rank — your profile stays free either way.</small>
        {error ? <small role="status">{error}</small> : null}
      </div>
    </div>
  );
}
