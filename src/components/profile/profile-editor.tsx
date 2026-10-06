"use client";

import { useState } from "react";

import { domainOf } from "@/lib/profile/draft";
import { CAREER, HOW, INTO, LIMITS, MEET, OPEN_TO, PAST_STATUS, STAGE, type PastStatus, type ProfileEdit } from "@/lib/profile/options";
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
    workHow: (p.workHow as ProfileEdit["workHow"]) ?? null,
    workStage: (p.workStage as ProfileEdit["workStage"]) ?? null,
    workCareer: (p.workCareer as ProfileEdit["workCareer"]) ?? null,
    wantsToMeet: p.wantsToMeet as ProfileEdit["wantsToMeet"],
    openTo: p.openTo as ProfileEdit["openTo"],
    into: p.into as ProfileEdit["into"],
    past: p.past.map((x) => ({ name: x.name, line: x.line, url: x.url, year: x.year, status: x.status })),
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
    workHow: e.workHow ?? null,
    workStage: e.workStage ?? null,
    workCareer: e.workCareer ?? null,
    wantsToMeet: e.wantsToMeet,
    openTo: e.openTo,
    into: e.into,
    past: e.past.map((x) => ({ ...x, year: x.year })),
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
  const [pc, setPc] = useState({ name: "", line: "", url: "", year: "", status: "live" as PastStatus });
  const set = (patch: Partial<ProfileEdit>) => onChange({ ...v, ...patch });

  function toggle(key: "wantsToMeet" | "openTo" | "into", val: string) {
    const list = v[key] as string[];
    if (list.includes(val)) return set({ [key]: list.filter((x) => x !== val) } as Partial<ProfileEdit>);
    const max = key === "wantsToMeet" ? LIMITS.meet : LIMITS[key];
    if (list.length >= max) return setLimitNote(`Up to ${max} here. Remove one first.`);
    setLimitNote(null);
    set({ [key]: [...list, val] } as Partial<ProfileEdit>);
  }

  function addPast() {
    if (!pc.name.trim()) return;
    const url = pc.url.trim() && !/^https?:\/\//i.test(pc.url.trim()) ? `https://${pc.url.trim()}` : pc.url.trim();
    const year = Number(pc.year) >= 1990 && Number(pc.year) <= 2100 ? Number(pc.year) : null;
    set({ past: [{ name: pc.name.trim(), line: pc.line.trim(), url, year, status: pc.status }, ...v.past].slice(0, LIMITS.past) });
    setPc({ name: "", line: "", url: "", year: "", status: "live" });
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
      <div className={cx("px-field")}>
        <label htmlFor="ed-pname">Project name</label>
        <input id="ed-pname" maxLength={40} value={v.projectName} onChange={(e) => set({ projectName: e.target.value })} />
      </div>
      <div className={cx("px-field")}>
        <label htmlFor="ed-purl">Project link</label>
        <input
          id="ed-purl"
          type="url"
          value={v.projectUrl}
          onChange={(e) => set({ projectUrl: e.target.value, projectName: v.projectName || domainOf(e.target.value) })}
        />
      </div>
      <div className={cx("px-field wide")}>
        <label htmlFor="ed-pline">
          What it does <small>(one line)</small>
        </label>
        <input id="ed-pline" maxLength={80} placeholder="The internet’s arena for underrated creators." value={v.projectTagline} onChange={(e) => set({ projectTagline: e.target.value })} />
      </div>
      <div className={cx("px-field wide px-past-ed")}>
        <span className={cx("px-lab")}>
          Previously cooked <small>(things you built before)</small>
        </span>
        <div id="pc-list">
          {v.past.length ? (
            v.past.map((x, i) => (
              <div key={`${x.name}-${i}`} className={cx("px-past-item")}>
                <span>
                  <b>{x.name}</b>{x.year ? ` · ${x.year}` : ""} · {PAST_STATUS[x.status]}
                </span>
                <button type="button" className={cx("px-text")} aria-label={`Remove ${x.name}`} onClick={() => set({ past: v.past.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className={cx("px-past-none")}>Nothing yet. Add your first one below.</p>
          )}
        </div>
        <div className={cx("px-past-add")}>
          <input id="pc-name" maxLength={40} placeholder="Project name" aria-label="Project name" value={pc.name} onChange={(e) => setPc({ ...pc, name: e.target.value })} />
          <input id="pc-line" maxLength={80} placeholder="What it did, in one line" aria-label="What it did" value={pc.line} onChange={(e) => setPc({ ...pc, line: e.target.value })} />
          <input id="pc-url" type="url" placeholder="Link" aria-label="Link" value={pc.url} onChange={(e) => setPc({ ...pc, url: e.target.value })} />
          <input id="pc-year" inputMode="numeric" maxLength={4} placeholder="Year" aria-label="Year" value={pc.year} onChange={(e) => setPc({ ...pc, year: e.target.value })} />
          <select id="pc-status" aria-label="What happened" value={pc.status} onChange={(e) => setPc({ ...pc, status: e.target.value as PastStatus })}>
            {Object.entries(PAST_STATUS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button className={cx("px-ghost")} type="button" id="pc-add" onClick={addPast}>
            + Add
          </button>
        </div>
      </div>
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
