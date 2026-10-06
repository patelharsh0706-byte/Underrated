"use client";

import { useState } from "react";

import { fetchProjectMeta } from "@/app/actions/onboarding";
import { LIMITS, PAST_STATUS, type PastStatus, type ProfileEdit } from "@/lib/profile/options";

import { cx } from "./profile-view";

// Step 5 · "What have you cooked before? 🍳" (DESIGN.md § Welcome v2). Paste a
// link → Underhyped fills in logo, name and one-liner → what happened → year.
// Never blocks: "Skip for now" finishes the profile too.

type Past = ProfileEdit["past"][number];
type Form = { url: string; name: string; line: string; status: PastStatus | null; year: string; logo: string | null };

const EMPTY: Form = { url: "", name: "", line: "", status: null, year: "", logo: null };
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);

interface StepProps {
  draft: ProfileEdit;
  onChange: (d: ProfileEdit) => void;
  onFinish: () => void;
  busy: boolean;
}

export function StepHistory({ draft, onChange, onFinish, busy }: StepProps) {
  // null = closed; otherwise the form, and which row it edits (-1 = new).
  const [form, setForm] = useState<Form | null>(null);
  const [editIndex, setEditIndex] = useState(-1);
  const [phase, setPhase] = useState<"url" | "details">("url");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  function open(i = -1) {
    const p = draft.past[i];
    setEditIndex(i);
    setForm(p ? { url: p.url, name: p.name, line: p.line, status: p.status, year: p.year ? String(p.year) : "", logo: logos[p.url] ?? null } : EMPTY);
    setPhase(p ? "details" : "url");
    setError(null);
  }

  async function lookUp(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setFetching(true);
    setError(null);
    const r = await fetchProjectMeta({ url: form.url });
    setFetching(false);
    if ("error" in r) return setError(r.error);
    setForm({ ...form, url: r.url, name: r.name, line: r.description, logo: r.logo });
    setPhase("details");
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setError("Give it a name.");
    if (!form.status) return setError("What happened to it? Pick one.");
    const item: Past = { name: form.name.trim().slice(0, 40), line: form.line.trim().slice(0, 80), url: form.url, year: form.year ? Number(form.year) : null, status: form.status };
    const past = editIndex >= 0 ? draft.past.map((p, i) => (i === editIndex ? item : p)) : [...draft.past, item].slice(0, LIMITS.past);
    if (form.url) setLogos((l) => ({ ...l, [form.url]: form.logo }));
    onChange({ ...draft, past });
    setForm(null);
  }

  function remove() {
    if (editIndex >= 0) onChange({ ...draft, past: draft.past.filter((_, i) => i !== editIndex) });
    setForm(null);
  }

  return (
    <div className={cx("ob-step")}>
      <header className={cx("px-look-head")}>
        <h1>What have you cooked before? 🍳</h1>
        <p>Shipped, sold, sunset or spectacularly failed — it all counts.</p>
      </header>

      {draft.past.length > 0 && (
        <ul className={cx("ob-rows")}>
          {draft.past.map((p, i) => (
            <li key={`${p.name}-${i}`} className={cx("ob-row")}>
              <Logo name={p.name} src={logos[p.url] ?? null} />
              <span className={cx("txt")}>
                <b>{p.name}</b>
                {p.line && <span>{p.line}</span>}
                <small>
                  {p.year ? `${p.year} · ` : ""}
                  <em className={cx(`pill st-${p.status}`)}>{PAST_STATUS[p.status]}</em>
                </small>
              </span>
              <button type="button" className={cx("px-text")} onClick={() => open(i)}>
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className={cx("ob-card ob-hist")}>
          {phase === "url" ? (
            <form className={cx("px-field")} noValidate onSubmit={(e) => void lookUp(e)}>
              <label htmlFor="ob-past-url">Project URL</label>
              <input id="ob-past-url" type="url" inputMode="url" autoFocus placeholder="https://yourproject.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <div className={cx("ob-inline-actions")}>
                <button className={cx("px-lime sm")} type="submit" disabled={fetching || form.url.trim().length < 3}>
                  {fetching ? "Looking it up…" : "Continue →"}
                </button>
                <button className={cx("px-text")} type="button" onClick={() => setPhase("details")}>
                  No link? Type it in
                </button>
                <button className={cx("px-text")} type="button" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form noValidate onSubmit={save} className={cx("ob-hist-form")}>
              <div className={cx("ob-found")}>
                <Logo name={form.name || "?"} src={form.logo} />
                <div className={cx("px-field")}>
                  <label htmlFor="ob-past-name">Name</label>
                  <input id="ob-past-name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className={cx("px-field")}>
                <label htmlFor="ob-past-line">
                  Description <small>(one line)</small>
                </label>
                <input id="ob-past-line" maxLength={80} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} />
              </div>
              <fieldset className={cx("ob-q")}>
                <legend className={cx("px-lab")}>What happened to it?</legend>
                <div className={cx("px-picks")}>
                  {(Object.keys(PAST_STATUS) as PastStatus[]).map((k) => (
                    <button key={k} type="button" className={cx(`px-pick ${form.status === k ? "on" : ""}`)} aria-pressed={form.status === k} onClick={() => setForm({ ...form, status: k })}>
                      {PAST_STATUS[k]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className={cx("px-field ob-year")}>
                <label htmlFor="ob-past-year">
                  Year <small>(optional)</small>
                </label>
                <select id="ob-past-year" className={cx("px-select")} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                  <option value="">—</option>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className={cx("ob-inline-actions")}>
                <button className={cx("px-lime sm")} type="submit">
                  {editIndex >= 0 ? "Save" : "Add project"}
                </button>
                <button className={cx("px-text")} type="button" onClick={remove}>
                  {editIndex >= 0 ? "Remove" : "Cancel"}
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className={cx("ob-err")} role="alert">
              {error}
            </p>
          )}
        </div>
      ) : draft.past.length === 0 ? (
        <button type="button" className={cx("ob-add")} onClick={() => open()}>
          <b>+ Add a past project</b>
          <span>Paste a link — we’ll fill in the rest.</span>
        </button>
      ) : (
        draft.past.length < LIMITS.past && (
          <button type="button" className={cx("px-text ob-another")} onClick={() => open()}>
            + Add another
          </button>
        )
      )}

      <div className={cx("px-actions")}>
        <button className={cx("px-lime")} type="button" disabled={busy || !!form} onClick={onFinish}>
          {busy ? "Saving…" : "Finish profile →"}
        </button>
        {draft.past.length === 0 && !form && (
          <button className={cx("px-text")} type="button" disabled={busy} onClick={onFinish}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

const PALETTE = ["#6B5BD6", "#C4399E", "#1D8E45", "#2F6BE0", "#B4603A", "#0F7B7B", "#E0A100", "#111111"];

/** The fetched logo, or the profile's coloured monogram when there's none. */
function Logo({ name, src }: { name: string; src: string | null }) {
  const [broken, setBroken] = useState(false);
  const bg = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- remote favicon via unavatar
    return <img className={cx("pf-logo sm")} src={src} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <span className={cx("pf-logo sm")} style={{ background: bg }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
