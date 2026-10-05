"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { clickDemo, getJudgeGate, judgeDemo } from "@/app/actions/demos";
import { SignInGate } from "@/components/auth/sign-in-gate";
import { consumeResumeFlag, onboardingHref, resumeHere, savePending, takePending } from "@/lib/pending-action";

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
  /** False when it didn't go ahead (already judged, or sign-in needed — the gate opens). */
  judge: (id: string, underhyped: boolean) => boolean;
  /** A judgement attempted before X sign-in, to replay on the same demo. */
  resume: { demoId: string; underhyped: boolean } | null;
  clearResume: () => void;
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

  // The gate (DECISIONS.md § 2026-10-06): signed out → the X pop-up, no
  // profile → onboarding, ok → the vote. Read in sample mode too, so
  // PREVIEW_MOCK=1 shows the same gate. null while it loads.
  const [gate, setGate] = useState<"signed-out" | "needs-profile" | "ok" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [resume, setResume] = useState<{ demoId: string; underhyped: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void getJudgeGate()
      .catch(() => "signed-out" as const)
      .then((g) => {
        if (!alive) return;
        setGate(g);
        // Back from X sign-in (and onboarding): hand the attempted judgement to the Judge screen.
        if (g === "ok" && consumeResumeFlag()) {
          const p = takePending("demo");
          if (p?.type === "demo") setResume({ demoId: p.demoId, underhyped: p.underhyped });
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  const clearResume = useCallback(() => setResume(null), []);

  const patch = useCallback((id: string, f: (d: SampleDemo) => SampleDemo) => setDemos((ds) => ds.map((d) => (d.id === id ? f(d) : d))), []);

  const judge = useCallback(
    (id: string, underhyped: boolean) => {
      if (voted[id]) return false;
      // Still checking who this is: a click this early does nothing.
      if (gate === null) return false;
      if (gate !== "ok") {
        // Kept, and replayed once they're back with a finished profile.
        savePending({ type: "demo", demoId: id, underhyped });
        if (gate === "needs-profile") window.location.assign(onboardingHref());
        else setGateOpen(true);
        return false;
      }
      setVoted((v) => ({ ...v, [id]: underhyped ? "yes" : "no" }));
      patch(id, (d) => ({ ...d, judges: d.judges + 1, underhyped: d.underhyped + (underhyped ? 1 : 0), trend: d.trend + (live ? 1 : 0) }));
      if (!live) return true;
      void judgeDemo({ demoId: id, verdict: underhyped ? "underhyped" : "not_yet" }).then((r) => {
        if (r.needsSignIn || r.needsProfile) {
          // Session expired between page load and the vote: undo and ask.
          setVoted((v) => {
            const rest = { ...v };
            delete rest[id];
            return rest;
          });
          patch(id, (d) => ({ ...d, judges: d.judges - 1, underhyped: d.underhyped - (underhyped ? 1 : 0), trend: d.trend - 1 }));
          savePending({ type: "demo", demoId: id, underhyped });
          // No profile yet: finish onboarding first, then this judgement replays.
          if (r.needsProfile) window.location.assign(onboardingHref());
          else setGateOpen(true);
          return;
        }
        if (r.error || r.judges === undefined) return;
        patch(id, (d) => ({ ...d, judges: r.judges!, underhyped: r.underhyped!, clicks: r.clicks ?? d.clicks }));
      });
      return true;
    },
    [voted, live, gate, patch],
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

  const value = useMemo(
    () => ({ live, demos, queue, voted, judge, click, reset, resume, clearResume }),
    [live, demos, queue, voted, judge, click, reset, resume, clearResume],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {gateOpen ? <SignInGate variant="demo" next={resumeHere()} onClose={() => setGateOpen(false)} /> : null}
    </Ctx.Provider>
  );
}

export function useDemos(): DemosState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemos must be used inside <DemosProvider>");
  return v;
}
