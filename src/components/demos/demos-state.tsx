"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { clickDemo, judgeDemo } from "@/app/actions/demos";

import { OTHERS, QUEUE, type SampleDemo } from "./sample-demos";

// Shared across /demos, /demos/top and /demos/submit through the /demos layout.
// live = real demos from the database (Phase 2): votes and clicks go through
// Server Actions, and the returned tallies replace the optimistic ones.
// Sample mode (PREVIEW_MOCK=1) keeps Phase 1's page-memory behaviour.

type Verdict = "yes" | "no";

interface DemosState {
  live: boolean;
  demos: SampleDemo[];
  /** Ids to judge, in RANKING.md § Demos order. */
  queue: string[];
  voted: Record<string, Verdict>;
  judge: (id: string, underhyped: boolean) => void;
  click: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<DemosState | null>(null);

const sampleDemos = () => [...QUEUE, ...OTHERS].map((d) => ({ ...d }));
const sampleQueue = QUEUE.map((d) => d.id);

export function DemosProvider({ children, initial }: { children: ReactNode; initial: { live: boolean; demos: SampleDemo[]; queue: string[] } | null }) {
  const live = !!initial?.live;
  const [demos, setDemos] = useState<SampleDemo[]>(() => (initial ? initial.demos : sampleDemos()));
  const [voted, setVoted] = useState<Record<string, Verdict>>({});
  const queue = initial ? initial.queue : sampleQueue;

  const patch = useCallback((id: string, f: (d: SampleDemo) => SampleDemo) => setDemos((ds) => ds.map((d) => (d.id === id ? f(d) : d))), []);

  const judge = useCallback(
    (id: string, underhyped: boolean) => {
      if (voted[id]) return;
      setVoted((v) => ({ ...v, [id]: underhyped ? "yes" : "no" }));
      patch(id, (d) => ({ ...d, judges: d.judges + 1, underhyped: d.underhyped + (underhyped ? 1 : 0), trend: d.trend + (live ? 1 : 0) }));
      if (!live) return;
      void judgeDemo({ demoId: id, verdict: underhyped ? "underhyped" : "not_yet" }).then((r) => {
        if (r.error || r.judges === undefined) return;
        patch(id, (d) => ({ ...d, judges: r.judges!, underhyped: r.underhyped!, clicks: r.clicks ?? d.clicks }));
      });
    },
    [voted, live, patch],
  );

  const click = useCallback(
    (id: string) => {
      patch(id, (d) => ({ ...d, clicks: d.clicks + 1 }));
      if (live) void clickDemo({ demoId: id });
    },
    [live, patch],
  );

  const reset = useCallback(() => {
    if (live) return; // real votes can't be undone
    setDemos(sampleDemos());
    setVoted({});
  }, [live]);

  const value = useMemo(() => ({ live, demos, queue, voted, judge, click, reset }), [live, demos, queue, voted, judge, click, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemos(): DemosState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemos must be used inside <DemosProvider>");
  return v;
}
