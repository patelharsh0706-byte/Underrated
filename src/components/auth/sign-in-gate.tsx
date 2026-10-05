"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import styles from "./sign-in-gate.module.css";

// The gate in front of the first pick — copy and layout from the approved
// prototype (DECISIONS.md § 2026-10-04 "Sign in with X to pick").
const COPY = {
  pick: ["🔥", "Make your pick count.", "Sign in to keep battles fair.", "One account. One pick per battle."],
  demo: ["⚡", "Make your judgement count.", "Sign in to keep Demos fair.", "One account. One judgement per demo."],
  hype: ["⚡", "Make your Hype count.", "Sign in so every Hype is a real person.", "One account. One Hype per creator."],
  signin: ["🔥", "Sign in to Underhyped.", "Your picks, your Hype, your profile.", "One account, made with X."],
} as const;

export type GateVariant = keyof typeof COPY;

interface SignInGateProps {
  variant: GateVariant;
  /** Where to come back to after X sign-in (a path on this site). */
  next: string;
  onClose: () => void;
}

export function SignInGate({ variant, next, onClose }: SignInGateProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [emoji, title, line, bold] = COPY[variant];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    buttonRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  async function continueWithX() {
    setBusy(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "x",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (signInError) {
      setError("X sign-in didn’t start. Try again in a moment.");
      setBusy(false);
    }
    // On success the browser leaves for X.
  }

  return (
    <div className={styles.scrim} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <p className={styles.emoji} aria-hidden="true">
          {emoji}
        </p>
        <h2 id="gate-title">{title}</h2>
        <p>
          {line}
          <br />
          <b>{bold}</b>
        </p>
        <button ref={buttonRef} className={styles.x} type="button" disabled={busy} onClick={() => void continueWithX()}>
          <span aria-hidden="true">𝕏</span> {busy ? "Opening X…" : "Continue with X"}
        </button>
        <p className={styles.fine}>Takes a few seconds. We never post for you.</p>
        {error ? (
          <p className={styles.error} role="status">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
