import type { ReactNode } from "react";

import s from "./demos.module.css";

// Phase 1 sample data — the same products and numbers as the approved
// artifact prototype (DECISIONS.md § 2026-09-30). The "videos" are scripted
// 15-second scenes: problem → interaction → result. Phase 2 replaces all of
// this with real uploads, judgements and clicks.

export interface SampleDemo {
  id: string;
  drop?: number;
  name: string;
  tag: string;
  host: string;
  color: string;
  grad?: string;
  cat: string;
  trend: number;
  judges: number;
  underhyped: number;
  clicks: number;
  scenes?: [string, ReactNode][];
  /** Real demos (Phase 2): the uploaded video and the product's link. */
  videoUrl?: string;
  url?: string;
}

const cursor = (x: string, y: string) => (
  <i className={s.dmCursor} style={{ ["--dm-cx" as string]: x, ["--dm-cy" as string]: y }} />
);

export const QUEUE: SampleDemo[] = [
  {
    id: "metricshots", drop: 38, name: "MetricShots", tag: "Turn numbers into social milestone cards.",
    host: "metricshots.app", color: "#6B5BD6", grad: "linear-gradient(135deg,#6B5BD6,#C4399E)",
    cat: "Creator tools", trend: 3, judges: 423, underhyped: 330, clicks: 71,
    scenes: [
      ["Problem", <>
        <p className={s.dmH}>You hit 10,000 followers.</p>
        <p className={s.dmS}>Your post about it looks like this:</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>“hit 10k today, thanks everyone”</span></div>
      </>],
      ["Interaction", <>
        <p className={s.dmS}>Paste the number. Pick a style.</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>10,000</span><span className={s.dmChipx}>followers</span><span className={s.dmChipx}>Bold ▾</span></div>
        <span className={s.dmBtnx}>Make card</span>
        {cursor("14%", "74%")}
      </>],
      ["Result", <>
        <div className={s.dmCardx}><span>MILESTONE</span><b>10K followers</b><span>@harsh · thank you ✦</span></div>
        <p className={s.dmS}>Share-ready in 3 seconds.</p>
      </>],
    ],
  },
  {
    id: "loopkit", drop: 39, name: "Loopkit", tag: "Record a bug once, get a link anyone can replay.",
    host: "loopkit.dev", color: "#0F7B7B", grad: "linear-gradient(135deg,#0F7B7B,#1D8E45)",
    cat: "Dev tools", trend: 5, judges: 205, underhyped: 180, clicks: 49,
    scenes: [
      ["Problem", <>
        <p className={s.dmH}>“Works on my machine.”</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>Steps to reproduce: ???</span><span className={s.dmChipx}>Screenshot.png</span></div>
      </>],
      ["Interaction", <>
        <p className={s.dmS}>Click record, hit the bug, stop.</p>
        <span className={s.dmBtnx}>● Record</span>
        {cursor("12%", "62%")}
      </>],
      ["Result", <>
        <div className={s.dmCardx}><span>REPLAY LINK</span><b>loopkit.dev/r/8f2a</b><span>clicks · network · console, frame by frame</span></div>
      </>],
    ],
  },
  {
    id: "receiptly", drop: 40, name: "Receiptly", tag: "Snap a receipt, split it with friends in three taps.",
    host: "receiptly.co", color: "#B4603A", grad: "linear-gradient(135deg,#B4603A,#E0A100)",
    cat: "Finance", trend: -2, judges: 251, underhyped: 158, clicks: 35,
    scenes: [
      ["Problem", <>
        <p className={s.dmH}>Dinner for 6. One bill.</p>
        <p className={s.dmS}>Someone opens the calculator app…</p>
      </>],
      ["Interaction", <>
        <p className={s.dmS}>Snap it. Tap who had what.</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>🍕 Pizza → Ana, Dev</span><span className={s.dmChipx}>🍷 Wine → everyone</span></div>
        <span className={s.dmBtnx}>Split</span>
        {cursor("12%", "76%")}
      </>],
      ["Result", <>
        <div className={s.dmCardx}><span>YOU OWE</span><b>$23.40</b><span>requests sent to 5 friends</span></div>
      </>],
    ],
  },
  {
    id: "tabby", drop: 41, name: "Tabby", tag: "Close 40 tabs, keep the three that matter.",
    host: "tabby.tools", color: "#2F6BE0", grad: "linear-gradient(135deg,#2F6BE0,#6B5BD6)",
    cat: "Productivity", trend: 0, judges: 6, underhyped: 5, clicks: 4,
    scenes: [
      ["Problem", <>
        <p className={s.dmH}>43 tabs open.</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>Docs</span><span className={s.dmChipx}>Docs (2)</span><span className={s.dmChipx}>untitled</span><span className={s.dmChipx}>…</span></div>
      </>],
      ["Interaction", <>
        <p className={s.dmS}>One shortcut. Tabby reads what you were doing.</p>
        <span className={s.dmBtnx}>⌘⇧K  Tidy</span>
        {cursor("12%", "66%")}
      </>],
      ["Result", <>
        <div className={s.dmRowx}><span className={s.dmChipx}>Pricing draft</span><span className={s.dmChipx}>Stripe docs</span><span className={s.dmChipx}>Figma</span></div>
        <div className={s.dmRowx}><span className={s.dmChipx} style={{ opacity: 0.45, textDecoration: "line-through" }}>40 others saved for later</span></div>
      </>],
    ],
  },
  {
    id: "shiplog", drop: 42, name: "Shiplog", tag: "Your git commits, rewritten as a changelog people read.",
    host: "shiplog.so", color: "#111111", grad: "linear-gradient(135deg,#111,#444)",
    cat: "Dev tools", trend: 4, judges: 96, underhyped: 81, clicks: 22,
    scenes: [
      ["Problem", <>
        <p className={s.dmH}>fix: stuff (#412)</p>
        <div className={s.dmRowx}><span className={s.dmChipx}>wip</span><span className={s.dmChipx}>asdf</span><span className={s.dmChipx}>final final</span></div>
      </>],
      ["Interaction", <>
        <p className={s.dmS}>Connect the repo. Pick the release.</p>
        <span className={s.dmBtnx}>Write changelog</span>
        {cursor("14%", "66%")}
      </>],
      ["Result", <>
        <div className={s.dmCardx}><span>v2.4 — WHAT&apos;S NEW</span><b>Exports are 3× faster</b><span>+ dark mode · + CSV import</span></div>
      </>],
    ],
  },
];

/** Ranked alongside the queue, never shown in it — so ranks read like a real week. */
export const OTHERS: SampleDemo[] = [
  { id: "cueboard", name: "Cueboard", tag: "A teleprompter that follows your voice.", host: "cueboard.app", color: "#C4399E", cat: "Creator tools", trend: -1, judges: 510, underhyped: 413, clicks: 88 },
  { id: "mapstack", name: "Mapstack", tag: "Plan a trip by dragging places onto days.", host: "mapstack.app", color: "#1D8E45", cat: "Productivity", trend: 2, judges: 340, underhyped: 252, clicks: 61 },
  { id: "formfly", name: "Formfly", tag: "Forms that fill themselves from a pasted link.", host: "formfly.app", color: "#E0A100", cat: "Productivity", trend: 1, judges: 8, underhyped: 7, clicks: 3 },
];

export const CATEGORIES = ["Dev tools", "Creator tools", "Productivity", "Finance"] as const;
