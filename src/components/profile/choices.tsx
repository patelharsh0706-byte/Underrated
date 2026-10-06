"use client";

import { cx } from "./profile-view";

// The two pickers the onboarding steps are built from (DESIGN.md § Welcome v2):
// one answer from a short list, or several up to a limit.

interface SingleProps<T extends string> {
  label: string;
  optional?: boolean;
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
}

export function SingleChoice<T extends string>({ label, optional, options, value, onChange }: SingleProps<T>) {
  return (
    <fieldset className={cx("ob-q")}>
      <legend className={cx("px-lab")}>
        {label} {optional && <small>(optional)</small>}
      </legend>
      <div className={cx("px-picks")}>
        {options.map((o) => {
          const on = value === o;
          return (
            <button key={o} type="button" className={cx(`px-pick ${on ? "on" : ""}`)} aria-pressed={on} onClick={() => onChange(on ? null : o)}>
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface MultiProps<T extends string> {
  label: string;
  max: number;
  options: readonly T[];
  value: readonly T[];
  onChange: (v: T[]) => void;
  /** Shown after the visible options, e.g. "+ Show more". */
  more?: React.ReactNode;
}

export function MultiChoice<T extends string>({ label, max, options, value, onChange, more }: MultiProps<T>) {
  const full = value.length >= max;
  return (
    <fieldset className={cx("ob-q")}>
      <legend className={cx("px-lab")}>
        {label} <small>(up to {max})</small>
      </legend>
      <div className={cx("px-picks")}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              className={cx(`px-pick ${on ? "on" : ""}`)}
              aria-pressed={on}
              aria-disabled={!on && full}
              onClick={() => (on ? onChange(value.filter((x) => x !== o)) : !full && onChange([...value, o]))}
            >
              {o}
            </button>
          );
        })}
        {more}
      </div>
      <p className={cx("ob-count")} aria-live="polite">
        {full ? `That’s ${max} — tap one to swap it.` : `${value.length} / ${max}`}
      </p>
    </fieldset>
  );
}
