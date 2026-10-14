"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addProjects } from "@/app/actions/projects";
import { splitLinks } from "@/lib/profile/project-meta";

import { cx } from "./profile-view";

// The owner's dashed paste box (Underhyped Arena artifact v71): first in
// "Previously cooked" (one link or a whole list), or in "Currently cooking"
// when there's no current project (one link). Visitors never see it.

interface ProjectPasteProps {
  kind: "past" | "current";
  /** Rows view: the box sits above the rows, and placeholders are rows too. */
  rows?: boolean;
}

export function ProjectPaste({ kind, rows = false }: ProjectPasteProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [reading, setReading] = useState(0);
  const [pending, startTransition] = useTransition();
  const current = kind === "current";
  const prompt = current ? "What are you cooking right now? Paste its link" : "Paste a link, or a whole list";

  function add() {
    const count = Math.min(current ? 1 : 10, splitLinks(text).length);
    if (!count || pending) return;
    setNotes([]);
    setReading(count);
    startTransition(async () => {
      const r = await addProjects({ kind, text });
      if (r.error) {
        setNotes([r.error]);
        return;
      }
      setNotes(r.notes);
      if (r.added) {
        setText("");
        router.refresh();
      }
    });
  }

  const skeletons = pending
    ? Array.from({ length: reading }, (_, i) =>
        rows ? (
          <div key={i} className={cx("pf-row is-skel")} aria-hidden="true">
            <span className={cx("pf-logo sm")} style={{ background: "var(--hairline)" }} />
            <span className={cx("txt")}>
              <b>Reading…</b>
              <span className={cx("pf-skel-line")} style={{ width: "60%" }} />
            </span>
            <span />
          </div>
        ) : (
          <div key={i} className={cx(`pf-card is-skel${current ? " big" : ""}`)} aria-hidden="true">
            <span className={cx("pf-card-img")} />
            <span className={cx("pf-card-body")}>
              <span className={cx("pf-logo")} style={{ background: "var(--hairline)" }} />
              <span className={cx("txt")}>
                <b>Reading…</b>
                <span className={cx("pf-skel-line")} style={{ width: "80%" }} />
                <span className={cx("pf-skel-line")} style={{ width: "50%" }} />
              </span>
              <span />
            </span>
          </div>
        ),
      )
    : null;

  // Currently cooking: the placeholder takes the box's place while reading.
  if (current && pending) return <>{skeletons}</>;

  return (
    <>
      <div className={cx(`pf-paste${rows ? " is-rows" : ""}${current ? " is-current" : ""}`)}>
        <textarea
          rows={current ? 1 : 3}
          aria-label={prompt}
          placeholder={prompt}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds in the one-link box; ⌘/Ctrl+Enter adds a list.
            if (e.key === "Enter" && (current || e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
        />
        <div className={cx("pf-paste-foot")}>
          <small>Reads the name, icon and picture</small>
          <button className={cx("px-lime")} type="button" onClick={add} disabled={pending || !text.trim()}>
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
        {notes.length > 0 && (
          <ul className={cx("pf-paste-notes")} role="status">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>
      {skeletons}
    </>
  );
}
