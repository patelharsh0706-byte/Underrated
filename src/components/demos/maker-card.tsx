"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import s from "./demos.module.css";

// "For makers" — turns judges into submitters. The prompt text is the
// operator's, word for word, with the 1280×720 / 8 MB limits from the upload rules.
const PLACEHOLDER = "[PASTE YOUR WEBSITE URL]";
const PROMPT =
  "Make a simple 15-second motion product demo for [PASTE YOUR WEBSITE URL] using Remotion, rendered straight to MP4 at 1280×720 (16:9 landscape). " +
  "First study the website and work out the product, its main user, the core problem, the single most important interaction and the result it gives. " +
  "Then write the storyline yourself as three beats plus an end card: problem (0–3.5s), interaction (3.5–7.5s), result (7.5–12s), and logo with tagline and CTA (12–15s).\n\n" +
  "Take the brand colours, fonts, logo and UI style from the site. Rebuild the real UI instead of placeholders. " +
  "Keep it premium and simple: big headlines revealed word by word, a real cursor click on the key action, rolling numbers, slow push-ins, cuts on a 120 BPM beat and a light film-grain finish. " +
  "Compose original music and sound effects in code, with a satisfying click on the main action and one deep impact on the end card.\n\n" +
  "Use only true claims from the site, with no invented stats. Check a still of each beat for layout problems before rendering, then deliver the 1280×720 MP4 (under 8 MB) plus the editable project zip.";

export function MakerCard() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const preRef = useRef<HTMLPreElement>(null);
  const u = url.trim();
  const [before, after] = PROMPT.split(PLACEHOLDER);

  function copy() {
    const text = u ? PROMPT.replace(PLACEHOLDER, u) : PROMPT;
    const fallback = () => {
      if (!preRef.current) return;
      const r = document.createRange();
      r.selectNodeContents(preRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      setNote("Selected — press ⌘C (or Ctrl+C) to copy.");
    };
    try {
      navigator.clipboard.writeText(text).then(
        () => setNote(u ? "Copied with your website filled in. Paste it into Claude." : "Copied. Add your website where it says [PASTE YOUR WEBSITE URL]."),
        fallback,
      );
    } catch {
      fallback();
    }
  }

  return (
    <section className={s.dmMake} aria-labelledby="dm-make-h">
      <span className={s.dmMakeTag}>For makers</span>
      <h2 id="dm-make-h">Get started with motion video and get real feedback.</h2>
      <ol className={s.dmMakeSteps}>
        <li>
          <b>Add your website</b>
          <span>It goes straight into the prompt.</span>
        </li>
        <li>
          <b>Copy the prompt</b>
          <span>Your website is already filled in.</span>
        </li>
        <li>
          <b>Paste it into Claude to get your video</b>
          <span>A 15-second 1280×720 MP4 — best in Claude Code, which renders it with Remotion.</span>
        </li>
        <li>
          <b>Submit it here</b>
          <span>The internet decides if it deserves more hype.</span>
        </li>
      </ol>
      <label className={s.dmMakeLabel} htmlFor="dm-make-url">
        Your website
      </label>
      <input
        className={s.dmMakeUrl}
        id="dm-make-url"
        inputMode="url"
        placeholder="https://yourproduct.com"
        autoComplete="off"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className={s.dmPrompt}>
        <div className={s.dmPromptHead}>
          <span>Claude prompt</span>
          <button className={s.dmCopy} type="button" onClick={copy}>
            Copy prompt
          </button>
        </div>
        <pre ref={preRef}>
          {before}
          <mark>{u || PLACEHOLDER}</mark>
          {after}
        </pre>
      </div>
      <p className={s.dmCopied} role="status">
        {note}
      </p>
      <Link className={s.dmNext} href="/demos/submit">
        Submit your 15-sec demo <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
