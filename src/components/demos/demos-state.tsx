"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { OTHERS, QUEUE, type SampleDemo } from "./sample-demos";

// Phase 1: votes and clicks live in page memory, shared across /demos,
// /demos/top and /demos/submit through the /demos layout — as they were in
// the single-page prototype. Nothing is saved; a reload starts fresh.
// Phase 2 swaps this for judgeDemo()/clickDemo() Server Actions.

type Verdict = "yes" | "no";

interface DemosState {
  demos: SampleDemo[];
  voted: Record<string, Verdict>;
  judge: (id: string, underhyped: boolean) => void;
  click: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<DemosState | null>(null);

const fresh = () => [...QUEUE, ...OTHERS].map((d) => ({ ...d }));

export function DemosProvider({ children }: { children: ReactNode }) {
  const [demos, setDemos] = useState<SampleDemo[]>(fresh);
  const [voted, setVoted] = useState<Record<string, Verdict>>({});

  // Updaters stay pure (React runs them twice in dev); the one-judgement-per-
  // demo check reads current state instead.
  const judge = useCallback(
    (id: string, underhyped: boolean) => {
      if (voted[id]) return;
      setVoted((v) => ({ ...v, [id]: underhyped ? "yes" : "no" }));
      setDemos((ds) => ds.map((d) => (d.id === id ? { ...d, judges: d.judges + 1, underhyped: d.underhyped + (underhyped ? 1 : 0) } : d)));
    },
    [voted],
  );

  const click = useCallback((id: string) => {
    setDemos((ds) => ds.map((d) => (d.id === id ? { ...d, clicks: d.clicks + 1 } : d)));
  }, []);

  const reset = useCallback(() => {
    setDemos(fresh());
    setVoted({});
  }, []);

  const value = useMemo(() => ({ demos, voted, judge, click, reset }), [demos, voted, judge, click, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemos(): DemosState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemos must be used inside <DemosProvider>");
  return v;
}
