"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MIN_JUDGES, pctUnderhyped, rankDemos } from "@/lib/demos/rank";

import { useDemos } from "./demos-state";
import { DemosTabs } from "./demos-tabs";
import s from "./demos.module.css";
import { QUEUE } from "./sample-demos";

// The judging loop, ported from the approved prototype: a 15-second demo
// plays (problem → interaction → result), the viewer votes Underhyped ⚡ or
// Not yet 🥱, and the result card shows the split, judges, clicks and rank.
const DEMO_MS = 15000;

function useCountUp(target: number, run: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 700);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

export function DemosJudge() {
  const { demos, voted, judge, click, reset } = useDemos();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"ask" | "result" | "done">("ask");
  const [scene, setScene] = useState(0);
  const [ended, setEnded] = useState(false);
  const [split, setSplit] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const barRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [runId, setRunId] = useState(0); // bumped by Replay

  const sample = QUEUE[idx];
  const live = demos.find((d) => d.id === sample.id) ?? sample;
  const isDone = phase === "done";

  // The 15-second clock: one loop per demo (or replay). Pauses while the tab
  // is hidden and resumes where it left off.
  useEffect(() => {
    if (isDone) return;
    let raf = 0;
    let start = 0;
    let elapsed = 0;
    let running = false;

    const tick = (now: number) => {
      if (!running) return;
      const t = Math.min(DEMO_MS, elapsed + (now - start));
      if (barRef.current) barRef.current.style.width = `${(t / DEMO_MS) * 100}%`;
      if (leftRef.current) leftRef.current.textContent = t >= DEMO_MS ? "Done" : `${Math.ceil((DEMO_MS - t) / 1000)} sec left`;
      setScene(Math.min(2, Math.floor(t / 5000)));
      if (t >= DEMO_MS) {
        running = false;
        elapsed = DEMO_MS;
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (running || elapsed >= DEMO_MS) return;
      running = true;
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const pause = () => {
      if (!running) return;
      running = false;
      elapsed = Math.min(DEMO_MS, elapsed + (performance.now() - start));
      cancelAnimationFrame(raf);
    };
    const onVis = () => (document.hidden ? pause() : play());

    play();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      pause();
    };
  }, [idx, isDone, runId]);

  function replay() {
    setEnded(false);
    setScene(0);
    setRunId((r) => r + 1);
  }

  const { ranked } = rankDemos(demos);
  const rank = ranked.find((r) => r.id === live.id)?.rank ?? null;
  const pct = pctUnderhyped(live);
  const shownYes = useCountUp(pct, phase === "result");
  const shownNo = useCountUp(100 - pct, phase === "result");
  const mine = voted[live.id];

  function vote(underhyped: boolean) {
    if (voted[live.id]) return;
    judge(live.id, underhyped);
    setSplit(0);
    setPhase("result");
    requestAnimationFrame(() => requestAnimationFrame(() => setSplit(1)));
    setTimeout(() => nextRef.current?.focus({ preventScroll: true }), 0);
  }

  function next() {
    setEnded(false);
    setScene(0);
    if (idx < QUEUE.length - 1) {
      setIdx(idx + 1);
      setPhase("ask");
    } else {
      setPhase("done");
    }
  }

  function restart() {
    reset();
    setEnded(false);
    setScene(0);
    setIdx(0);
    setPhase("ask");
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const judgedCount = Object.keys(voted).filter((id) => QUEUE.some((q) => q.id === id)).length;
  const yours =
    mine === "yes"
      ? pct >= 50
        ? "You’re with the crowd — ⚡ underhyped."
        : "You saw something the crowd didn’t."
      : pct < 50
        ? "You’re with the crowd — not yet."
        : "Tough crowd of one — most people disagree.";

  return (
    <>
      <div className={s.dmTop}>
        <div>
          <p className={s.dmKicker}>Underhyped Demos</p>
          <h1 className={s.dmTitle}>15 seconds. No pitch deck.</h1>
          <p className={s.dmSub}>Does this deserve more hype?</p>
        </div>
        <DemosTabs />
      </div>

      <section className={s.dmStage} aria-label="Product demo">
        {phase !== "done" && (
          <>
            <p className={s.dmDrop}>Product drop #{sample.drop}</p>
            <div className={s.dmPlayer}>
              <div className={s.dmScreen} aria-hidden="true">
                <div className={s.dmWin} style={{ ["--dm-grad" as string]: sample.grad, ["--dm-accent" as string]: "#D8FF3E" }}>
                  <div className={s.dmChrome}>
                    <i />
                    <i />
                    <i />
                    <span>{sample.host}</span>
                  </div>
                  {sample.scenes?.map(([cap, body], i) => (
                    <div key={cap} className={`${s.dmScene} ${i === scene ? s.isOn : ""}`}>
                      <span className={s.dmCap}>{cap}</span>
                      {body}
                    </div>
                  ))}
                </div>
              </div>
              {ended && (
                <button className={s.dmPlay} type="button" aria-label="Replay demo" onClick={replay}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
                  </svg>
                  Replay
                </button>
              )}
              <div className={s.dmBar}>
                <i ref={barRef} />
              </div>
              <span className={s.dmLeft} ref={leftRef}>
                15 sec left
              </span>
              <span className={s.dmSample}>Sample demo</span>
            </div>

            <div className={s.dmMeta}>
              <h2>{sample.name}</h2>
              <p>{sample.tag}</p>
            </div>
          </>
        )}

        {phase === "ask" && (
          <div>
            <p className={s.dmQ}>Does this deserve hype?</p>
            <div className={s.dmVotes}>
              <button className={`${s.dmVote} ${s.dmYes}`} type="button" onClick={() => vote(true)}>
                Underhyped <span aria-hidden="true">⚡</span>
              </button>
              <button className={`${s.dmVote} ${s.dmNo}`} type="button" onClick={() => vote(false)}>
                Not yet <span aria-hidden="true">🥱</span>
              </button>
            </div>
            <button
              className={s.dmVisit}
              type="button"
              onClick={() => {
                click(live.id);
                setToast(`Would open ${sample.host} in a new tab — counted as a click (sample data).`);
              }}
            >
              View product <span aria-hidden="true">↗</span>
            </button>
          </div>
        )}

        {phase === "result" && (
          <div className={s.dmResult}>
            <p className={s.dmSpoken}>The internet has spoken</p>
            <div className={s.dmSplit} aria-hidden="true">
              <i style={{ width: `${split ? pct : 0}%` }} />
            </div>
            <div className={s.dmPcts}>
              <p>
                <b>{shownYes}%</b>
                <span>⚡ Underhyped</span>
              </p>
              <p>
                <b>{shownNo}%</b>
                <span>🥱 Not yet</span>
              </p>
            </div>
            <ul className={s.dmFacts}>
              <li>
                <b>{live.judges.toLocaleString("en-US")}</b> people judged this demo
              </li>
              <li>
                ↗ <b>{live.clicks.toLocaleString("en-US")}</b> checked out the product
              </li>
              <li>
                {rank ? (
                  <>
                    Current rank: <b>#{rank}</b> this week
                  </>
                ) : (
                  <>
                    Not ranked yet — needs <b>{MIN_JUDGES - live.judges} more judges</b>
                  </>
                )}
              </li>
            </ul>
            <p className={s.dmYours}>{yours}</p>
            <button className={s.dmNext} type="button" ref={nextRef} onClick={next}>
              {idx < QUEUE.length - 1 ? "Next demo →" : "Finish →"}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className={s.dmDone}>
            <p className={s.dmSpoken}>That&rsquo;s every demo for now</p>
            <h2>
              You judged <b>{judgedCount}</b> products.
            </h2>
            <p>New drops land as makers submit them.</p>
            <div className={s.dmDoneCtas}>
              <Link className={s.dmNext} href="/demos/top">
                See top this week <span aria-hidden="true">→</span>
              </Link>
              <Link className={s.dmGhost} href="/demos/submit">
                Submit yours
              </Link>
              <button className={s.dmGhost} type="button" onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}
      </section>

      {toast && (
        <p className={s.dmToast} role="status">
          {toast}
        </p>
      )}
    </>
  );
}
