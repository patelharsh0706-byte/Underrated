"use client";

import type { ProfileEdit } from "@/lib/profile/options";

import { cx } from "./profile-view";

// The tiny ✎ edits on "Looking good?" — About, location and the current
// project change in place, without opening the full editor.

export type InlineField = "about" | "location" | "project";

interface InlineEditProps {
  field: InlineField;
  draft: ProfileEdit;
  onChange: (d: ProfileEdit) => void;
  onDone: () => void;
}

export function InlineEdit({ field, draft, onChange, onDone }: InlineEditProps) {
  const set = (patch: Partial<ProfileEdit>) => onChange({ ...draft, ...patch });
  return (
    <form
      className={cx("ob-inline")}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      {field === "about" && (
        <div className={cx("px-field")}>
          <label htmlFor="ob-ie-about">About</label>
          <textarea id="ob-ie-about" autoFocus maxLength={200} value={draft.about} onChange={(e) => set({ about: e.target.value })} />
          <span className={cx("hint")}>
            <span>Who you are and what you make.</span>
            <span>{draft.about.length} / 200</span>
          </span>
        </div>
      )}
      {field === "location" && (
        <div className={cx("px-field")}>
          <label htmlFor="ob-ie-loc">Location</label>
          <input id="ob-ie-loc" autoFocus maxLength={40} placeholder="🇮🇳 Bengaluru" value={draft.location} onChange={(e) => set({ location: e.target.value })} />
          <label className={cx("px-check")} htmlFor="ob-ie-loc-hide">
            <input id="ob-ie-loc-hide" type="checkbox" checked={draft.locationHidden} onChange={(e) => set({ locationHidden: e.target.checked })} /> Hide my location
          </label>
        </div>
      )}
      {field === "project" && (
        <>
          <div className={cx("px-field")}>
            <label htmlFor="ob-ie-pname">Project name</label>
            <input id="ob-ie-pname" autoFocus maxLength={40} value={draft.projectName} onChange={(e) => set({ projectName: e.target.value })} />
          </div>
          <div className={cx("px-field")}>
            <label htmlFor="ob-ie-pline">
              One line about it <small>(optional)</small>
            </label>
            <input id="ob-ie-pline" maxLength={80} value={draft.projectTagline} onChange={(e) => set({ projectTagline: e.target.value })} />
          </div>
          <div className={cx("px-field")}>
            <label htmlFor="ob-ie-purl">Link</label>
            <input id="ob-ie-purl" type="url" inputMode="url" value={draft.projectUrl} onChange={(e) => set({ projectUrl: e.target.value })} />
          </div>
        </>
      )}
      <div className={cx("ob-inline-actions")}>
        <button className={cx("px-lime sm")} type="submit">
          Done
        </button>
      </div>
    </form>
  );
}
