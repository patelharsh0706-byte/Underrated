"use client";

import { cx } from "./profile-view";

// ● — ○ — ○ — ○   Profile · You · Interests · History (DESIGN.md § Welcome v2).
// Finished steps can be revisited; later ones can't be skipped to.

export const STEPS = ["Profile", "You", "Interests", "History"] as const;

interface StepperProps {
  /** 0-based index into STEPS. */
  at: number;
  onGo: (i: number) => void;
}

export function OnboardingStepper({ at, onGo }: StepperProps) {
  return (
    <nav className={cx("ob-stepper")} aria-label="Profile steps">
      <ol>
        {STEPS.map((label, i) => {
          const state = i < at ? "done" : i === at ? "now" : "next";
          return (
            <li key={label} className={cx(state)}>
              <button type="button" disabled={i >= at} aria-current={i === at ? "step" : undefined} onClick={() => onGo(i)}>
                <i aria-hidden="true">{i < at ? "✓" : ""}</i>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
