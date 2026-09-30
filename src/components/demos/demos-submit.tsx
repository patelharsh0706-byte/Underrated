"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { checkClipDuration, checkClipFile, checkClipShape } from "@/lib/demos/check-clip";

import { DemosTabs } from "./demos-tabs";
import s from "./demos.module.css";

// Submit yours — four steps, ported from the prototype. Phase 1: the file is
// checked and previewed in the browser only (never uploaded), and the $3 step
// is a mock. Phase 2 uploads to Vercel Blob and takes the real payment.
const STEPS = ["Product", "15-sec demo", "$3", "Review"];
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}/i;
const BARE_RE = /^[^\s.]+\.[a-z]{2,}(\/\S*)?$/i;

/** Reads a video's length and pixel size; screen-recorder WebM often reports
 * an Infinity duration until seeked. */
function readVideo(src: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = () => resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onloadedmetadata = () => {
      if (v.duration === Infinity) {
        v.currentTime = 1e101;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          done();
        };
        return;
      }
      done();
    };
    v.onerror = () => resolve({ duration: Number.NaN, width: 0, height: 0 });
    v.src = src;
  });
}

export function DemosSubmit() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [url, setUrl] = useState("");
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");
  const [clip, setClip] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [warn, setWarn] = useState("");
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the object URL when the clip changes or the page unmounts.
  useEffect(() => () => void (clip && URL.revokeObjectURL(clip)), [clip]);

  function bad(msg: string) {
    setErr2(msg);
    setClip(null);
    setInfo("");
    setWarn("");
    setReady(false);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const typeErr = checkClipFile(f);
    if (typeErr) return bad(typeErr);
    setErr2("Checking length…");
    const src = URL.createObjectURL(f);
    const { duration: secs, width, height } = await readVideo(src);
    const durErr = checkClipDuration(secs);
    if (durErr) {
      URL.revokeObjectURL(src);
      return bad(durErr);
    }
    setErr2("");
    setClip(src);
    const shapeWarn = checkClipShape(width, height);
    setWarn(shapeWarn ?? "");
    setInfo(`${width}×${height} · ${secs.toFixed(1)}s · ${(f.size / 1048576).toFixed(1)} MB ${shapeWarn ? "" : "✓  Looks good."}`.trim());
    setReady(true);
  }

  function reset() {
    setName("");
    setTag("");
    setUrl("");
    setErr1("");
    bad("");
    if (fileRef.current) fileRef.current.value = "";
    setStep(0);
  }

  return (
    <>
      <div className={s.dmTop}>
        <div>
          <p className={s.dmKicker}>Underhyped Demos</p>
          <h1 className={s.dmTitle}>15 seconds to make us care.</h1>
          <p className={s.dmSub}>Show the thing. Not the founder, not the deck.</p>
        </div>
        <DemosTabs />
      </div>

      <div className={s.dmSubmit}>
        <ol className={s.dmSteps} aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? s.isOn : i < step ? s.isDone : undefined}>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <form
            className={s.dmCard}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return setErr1("Give the product a name.");
              if (!tag.trim()) return setErr1("Add a one-line tagline — what does it do?");
              if (!URL_RE.test(url.trim()) && !BARE_RE.test(url.trim())) return setErr1("That URL looks off — try something like https://yourproduct.com");
              setErr1("");
              setStep(1);
            }}
          >
            <label htmlFor="dm-f-name">Product name</label>
            <input id="dm-f-name" maxLength={40} placeholder="MetricShots" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            <label htmlFor="dm-f-tag">
              Tagline <small>(one line, up to 60 characters)</small>
            </label>
            <input id="dm-f-tag" maxLength={60} placeholder="Turn numbers into social milestone cards." autoComplete="off" value={tag} onChange={(e) => setTag(e.target.value)} />
            <label htmlFor="dm-f-url">Product URL</label>
            <input id="dm-f-url" inputMode="url" placeholder="https://metricshots.app" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
            <p className={s.dmErr} role="status">
              {err1}
            </p>
            <button className={s.dmNext} type="submit">
              Next: your demo <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {step === 1 && (
          <div className={s.dmCard}>
            <div className={s.dmRules}>
              <b>The 15-second rule</b>
              <div className={s.dmArc}>
                <span>0s</span>
                <i />
                <span>15s</span>
              </div>
              <p>Show the problem → show the interaction → show the result.</p>
              <p className={s.dmDont}>No &ldquo;Hi, I&rsquo;m the founder of&hellip;&rdquo; Nobody cares. Show the thing.</p>
            </div>
            <label className={s.dmDropZone} htmlFor="dm-f-file">
              <input ref={fileRef} id="dm-f-file" type="file" accept="video/mp4,video/webm" onChange={(e) => onFile(e.target.files?.[0])} />
              <b>Choose your screen recording</b>
              <span>MP4 or WebM · 1280×720 landscape · 15 seconds max · up to 8&nbsp;MB</span>
            </label>
            <p className={s.dmErr} role="status">
              {err2}
            </p>
            {(clip || info) && (
              <div className={s.dmPreview}>
                {clip ? <video src={clip} muted loop playsInline autoPlay /> : <video muted playsInline />}
                <p>{info}</p>
                {warn && (
                  <p className={s.dmWarn} role="status">
                    {warn}
                  </p>
                )}
              </div>
            )}
            <div className={s.dmRow}>
              <button
                className={s.dmGhost}
                type="button"
                onClick={() => {
                  bad("");
                  setInfo("Sample clip · 1280×720 · 14.0s ✓  (stand-in for your recording)");
                  setReady(true);
                }}
              >
                No clip handy? Use a sample
              </button>
              <button className={s.dmNext} type="button" disabled={!ready} onClick={() => setStep(2)}>
                Next: $3 <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={s.dmCard}>
            <div className={s.dmBill}>
              <p>
                <span>Demo entry</span>
                <b>$3.00</b>
              </p>
              <p className={s.dmSmall}>One time. It pays for review and hosting, and buys nothing about rank — the internet decides that.</p>
            </div>
            <p className={s.dmProto}>Preview — no card is charged yet.</p>
            <div className={s.dmRow}>
              <button className={s.dmGhost} type="button" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className={s.dmNext} type="button" onClick={() => setStep(3)}>
                Pay $3 &amp; submit <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={`${s.dmCard} ${s.dmReview}`}>
            <span className={s.dmCheck} aria-hidden="true">
              ✓
            </span>
            <h2>In review.</h2>
            <p>We watch every demo before it goes live, usually within 24 hours. Once approved, it drops into the Demos queue and the internet decides.</p>
            <div className={s.dmMini}>
              <div className={s.dmMiniScreen}>{clip && <video src={clip} muted loop playsInline autoPlay />}</div>
              <div>
                <b>{name || "Your product"}</b>
                <span>{tag}</span>
              </div>
            </div>
            <div className={s.dmRow}>
              <Link className={s.dmNext} href="/demos">
                Back to judging <span aria-hidden="true">→</span>
              </Link>
              <button className={s.dmGhost} type="button" onClick={reset}>
                Submit another
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
