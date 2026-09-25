"use client";

import { useId, useState, useTransition } from "react";

import { subscribeEmail } from "@/app/actions/email";
import type { EmailSource } from "@/lib/email-schema";

import styles from "./email-signup-form.module.css";

// One form, two looks: the weekly-drop banner on Home ("Keep me early") and
// the footer's "Get the latest" box (round lime arrow). Same action, same
// states — DESIGN.md § Footer (V3), DATABASE.md § email_signups.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSignupForm({ source }: { source: EmailSource }) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError(v ? "That email looks off — check for a typo." : source === "drop" ? "Add your email to get the drop." : "Add your email to get updates.");
      return;
    }
    startTransition(async () => {
      const res = await subscribeEmail({ email: v, source });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.preview) {
        // Never claim a sign-up that didn't happen (PREVIEW_MOCK=1 is local only).
        setDone("Preview mode — nothing was saved. Turn off PREVIEW_MOCK to store emails.");
        return;
      }
      setDone(
        source === "drop"
          ? `You’re in. The first drop lands in ${v.toLowerCase()} next week.`
          : `Subscribed. Updates go to ${v.toLowerCase()}.`,
      );
    });
  }

  const variant = source === "drop" ? styles.drop : styles.footer;

  if (done) {
    return (
      <p className={`${styles.msg} ${variant}`} role="status">
        {done}
      </p>
    );
  }

  return (
    <div className={variant}>
      <form className={`${styles.form} ${error ? styles.bad : ""}`} onSubmit={onSubmit} noValidate>
        <label className={styles.sr} htmlFor={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          disabled={pending}
        />
        {source === "drop" ? (
          <button type="submit" className={styles.dropBtn} disabled={pending}>
            Keep me early
            <svg className={styles.arrow} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <button type="submit" className={styles.roundBtn} aria-label="Subscribe" disabled={pending}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </form>
      {error && (
        <p className={`${styles.msg} ${styles.msgBad}`} role="status">
          {error}
        </p>
      )}
    </div>
  );
}
