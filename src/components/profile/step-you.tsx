"use client";

import { useState } from "react";

import { CAREER, HOW, LIMITS, MEET, STAGE, type ProfileEdit } from "@/lib/profile/options";

import { MultiChoice, SingleChoice } from "./choices";
import { cx } from "./profile-view";

// Step 3 · "What kind of builder are you?" (DESIGN.md § Welcome v2).

interface StepProps {
  draft: ProfileEdit;
  onChange: (d: ProfileEdit) => void;
  onNext: () => void;
}

export function StepYou({ draft, onChange, onNext }: StepProps) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ProfileEdit>) => onChange({ ...draft, ...patch });

  function next() {
    if (!draft.workHow || !draft.workStage) return setError("Pick how you work and where you are right now.");
    if (!draft.wantsToMeet.length) return setError("Pick who you’d like to meet — “Anyone interesting” works too.");
    setError(null);
    onNext();
  }

  return (
    <div className={cx("ob-step")}>
      <header className={cx("px-look-head")}>
        <h1>What kind of builder are you?</h1>
        <p>Help the right people discover you.</p>
      </header>
      <div className={cx("ob-card")}>
        <SingleChoice label="How do you work?" options={HOW} value={draft.workHow} onChange={(v) => set({ workHow: v })} />
        <SingleChoice label="Where are you right now?" options={STAGE} value={draft.workStage} onChange={(v) => set({ workStage: v })} />
        <SingleChoice label="Experience" optional options={CAREER} value={draft.workCareer} onChange={(v) => set({ workCareer: v })} />
        <MultiChoice label="Who would you like to meet?" max={LIMITS.meet} options={MEET} value={draft.wantsToMeet} onChange={(v) => set({ wantsToMeet: v })} />
      </div>
      {error && (
        <p className={cx("ob-err")} role="alert">
          {error}
        </p>
      )}
      <div className={cx("px-actions")}>
        <button className={cx("px-lime")} type="button" onClick={next}>
          Next: what you’re looking for →
        </button>
      </div>
    </div>
  );
}
