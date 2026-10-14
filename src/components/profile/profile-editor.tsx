"use client";

import { useState } from "react";

import { CAREER, HOW, INTO, LIMITS, MEET, OPEN_TO, STAGE, type ProfileEdit } from "@/lib/profile/options";
import type { ProfileV2 } from "@/lib/profile/queries";

import s from "./profile.module.css";

// "Edit details" — the same fields, order and limits as the approved prototype.
// The parent shows the change live (preview or profile) as the person types.

const cx = (names: string) =>
  names
    .split(" ")
    .filter(Boolean)
    .map((n) => s[n] ?? n)
    .join(" ");

export function editFromProfile(p: ProfileV2): ProfileEdit {
  return {
    tagline: p.tagline,
    about: p.about,
    location: p.location,
    locationHidden: p.locationHidden,
    projectName: p.projectName,
    projectTagline: p.projectTagline,
    projectUrl: p.workUrl ?? "",
    projectImageUrl: p.projectImageUrl,
    projectLogoUrl: p.projectLogoUrl,
    projectsView: p.projectsView,
    workHow: (p.workHow as ProfileEdit["workHow"]) ?? null,
    workStage: (p.workStage as ProfileEdit["workStage"]) ?? null,
    workCareer: (p.workCareer as ProfileEdit["workCareer"]) ?? null,
    wantsToMeet: p.wantsToMeet as ProfileEdit["wantsToMeet"],
    openTo: p.openTo as ProfileEdit["openTo"],
    into: p.into as ProfileEdit["into"],
    past: p.past.map((x) => ({ name: x.name, line: x.line, url: x.url, year: x.year, status: x.status, imageUrl: x.imageUrl, logoUrl: x.logoUrl })),
  };
}

export function profileWithEdit(p: ProfileV2, e: ProfileEdit): ProfileV2 {
  return {
    ...p,
    tagline: e.tagline,
    about: e.about,
    location: e.location,
    locationHidden: e.locationHidden,
    projectName: e.projectName,
    projectTagline: e.projectTagline,
    workUrl: e.projectUrl || p.workUrl,
    projectImageUrl: e.projectImageUrl,
    projectLogoUrl: e.projectLogoUrl,
    projectsView: e.projectsView,
    workHow: e.workHow ?? null,
    workStage: e.workStage ?? null,
    workCareer: e.workCareer ?? null,
    wantsToMeet: e.wantsToMeet,
    openTo: e.openTo,
    into: e.into,
    past: e.past.map((x, i) => ({ ...x, id: p.past[i]?.id ?? `edit-${i}` })),
  };
}

interface ProfileEditorProps {
  value: ProfileEdit;
  onChange: (next: ProfileEdit) => void;
  onDone: () => void;
  doneLabel?: string;
  /** Shown next to Save — leaves without saving. */
  onCancel?: () => void;
}

export function ProfileEditor({ value: v, onChange, onDone, doneLabel = "Done", onCancel }: ProfileEditorProps) {
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const set = (patch: Partial<ProfileEdit>) => onChange({ ...v, ...patch });

  function toggle(key: "wantsToMeet" | "openTo" | "into", val: string) {
    const list = v[key] as string[];
    if (list.includes(val)) return set({ [key]: list.filter((x) => x !== val) } as Partial<ProfileEdit>);
    const max = key === "wantsToMeet" ? LIMITS.meet : LIMITS[key];
    if (list.length >= max) return setLimitNote(`Up to ${max} here. Remove one first.`);
    setLimitNote(null);
    set({ [key]: [...list, val] } as Partial<ProfileEdit>);
  }

  const select = <T extends readonly string[]>(id: string, label: string, list: T, val: string | null | undefined, onPick: (x: T[number] | null) => void, empty = "Pick one") => (
    <div className={cx("px-field")}>
      <label htmlFor={id}>{label}</label>
      <select id={id} className={cx("px-select")} value={val ?? ""} onChange={(e) => onPick((e.target.value || null) as T[number] | null)}>
        <option value="">{empty}</option>
        {list.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  const picks = (key: "wantsToMeet" | "openTo" | "into", label: string, list: readonly string[]) => (
    <div className={cx("px-field wide")}>
      <span className={cx("px-lab")}>
        {label} <small>(up to {key === "wantsToMeet" ? LIMITS.meet : LIMITS[key]})</small>
      </span>
      <div className={cx("px-picks")}>
        {list.map((o) => {
          const on = (v[key] as string[]).includes(o);
          return (
            <button key={o} type="button" className={cx(`px-pick ${on ? "on" : ""}`)} aria-pressed={on} onClick={() => toggle(key, o)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <form
      className={cx("px-editor")}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <h3>
        Edit details<small>{onCancel ? "Save to see your profile. Your X profile isn’t touched." : "Changes show in the preview as you type. Your X profile isn’t touched."}</small>
      </h3>
      <div className={cx("px-field wide")}>
        <label htmlFor="ed-tag">
          Tagline <small>(one line)</small>
        </label>
        <input id="ed-tag" maxLength={140} value={v.tagline} onChange={(e) => set({ tagline: e.target.value })} />
      </div>
      <div className={cx("px-field wide")}>
        <label htmlFor="ed-about">
          About <small>(2–3 lines)</small>
        </label>
        <textarea id="ed-about" maxLength={200} value={v.about} onChange={(e) => set({ about: e.target.value })} />
        <span className={cx("hint")}>
          <span>Who you are and what you make.</span>
          <span>{v.about.length} / 200</span>
        </span>
      </div>
      {select("ed-how", "How you work", HOW, v.workHow, (x) => set({ workHow: x }))}
      {select("ed-stage", "Stage", STAGE, v.workStage, (x) => set({ workStage: x }))}
      {select("ed-career", "Experience", CAREER, v.workCareer, (x) => set({ workCareer: x }))}
      {picks("wantsToMeet", "Wants to meet", MEET)}
      {picks("openTo", "Open to", OPEN_TO)}
      {picks("into", "What you’re into", INTO)}
      {limitNote && (
        <p className={cx("px-past-none wide")} role="status">
          {limitNote}
        </p>
      )}
      <div className={cx("px-field")}>
        <label htmlFor="ed-loc">Location</label>
        <input id="ed-loc" maxLength={40} value={v.location} onChange={(e) => set({ location: e.target.value })} />
      </div>
      <div className={cx("px-field")} style={{ justifyContent: "flex-end" }}>
        <label className={cx("px-check")} htmlFor="ed-loc-hide">
          <input id="ed-loc-hide" type="checkbox" checked={v.locationHidden} onChange={(e) => set({ locationHidden: e.target.checked })} /> Hide my location
        </label>
      </div>
      <div className={cx("px-field wide")}>
        <span className={cx("px-lab")} id="ed-view">
          Projects show as
        </span>
        <div className={cx("px-seg")} role="radiogroup" aria-labelledby="ed-view">
          {(["rows", "cards"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={v.projectsView === k} onClick={() => set({ projectsView: k })}>
              {k === "rows" ? "Rows" : "Cards"}
            </button>
          ))}
        </div>
      </div>
      <p className={cx("px-past-none wide")}>Add and edit projects right on your profile — paste a link in the dashed box, or tap ⋯ on a project.</p>
      <div className={cx("px-editor-actions")}>
        <button className={cx("px-lime")} type="submit">
          {doneLabel}
        </button>
        {onCancel && (
          <button className={cx("px-ghost")} type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
