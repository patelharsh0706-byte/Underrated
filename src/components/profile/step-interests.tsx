"use client";

import { useState } from "react";

import { INTO, INTO_POPULAR, LIMITS, OPEN_TO, type ProfileEdit } from "@/lib/profile/options";

import { MultiChoice } from "./choices";
import { cx } from "./profile-view";

// Step 4 · "What are you open to?" (DESIGN.md § Welcome v2).

interface StepProps {
  draft: ProfileEdit;
  onChange: (d: ProfileEdit) => void;
  onNext: () => void;
}

export function StepInterests({ draft, onChange, onNext }: StepProps) {
  // Start expanded when an earlier pick is outside the popular ten.
  const [all, setAll] = useState(() => draft.into.some((t) => !(INTO_POPULAR as readonly string[]).includes(t)));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ProfileEdit>) => onChange({ ...draft, ...patch });

  function next() {
    if (!draft.openTo.length) return setError("Pick at least one — “Just connecting” works too.");
    setError(null);
    onNext();
  }

  return (
    <div className={cx("ob-step")}>
      <header className={cx("px-look-head")}>
        <h1>What are you open to?</h1>
      </header>
      <div className={cx("ob-card")}>
        <MultiChoice label="Open to" max={LIMITS.openTo} options={OPEN_TO} value={draft.openTo} onChange={(v) => set({ openTo: v })} />
        <MultiChoice
          label="What are you into?"
          max={LIMITS.into}
          options={all ? INTO : INTO_POPULAR}
          value={draft.into}
          onChange={(v) => set({ into: v })}
          more={
            !all && (
              <button type="button" className={cx("px-pick ob-more")} onClick={() => setAll(true)}>
                + Show more
              </button>
            )
          }
        />
      </div>
      {error && (
        <p className={cx("ob-err")} role="alert">
          {error}
        </p>
      )}
      <div className={cx("px-actions")}>
        <button className={cx("px-lime")} type="button" onClick={next}>
          Next: your builder history →
        </button>
      </div>
    </div>
  );
}
