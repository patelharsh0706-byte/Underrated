"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { refreshProject, removeProject, restoreSitePicture, updateProject } from "@/app/actions/projects";
import { isOwnPicture } from "@/lib/own-blob";
import { domainOf } from "@/lib/profile/draft";
import { PAST_STATUS, type PastStatus } from "@/lib/profile/options";
import type { ProjectTarget } from "@/lib/profile/project-target";

import { cx } from "./profile-view";

// The owner's ⋯ pop-up for one project (Underhyped Arena artifact v71).
// Edits show on the card as you type (onPatch) and are saved once, when the
// pop-up closes. Check again, the picture buttons and Remove act at once.

export interface MenuProject {
  name: string;
  line: string;
  url: string;
  year?: number | null;
  status?: PastStatus;
  imageUrl: string | null;
}

interface ProjectMenuProps {
  target: ProjectTarget;
  project: MenuProject;
  onPatch: (patch: Partial<MenuProject>) => void;
  onClose: () => void;
}

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

export function ProjectMenu({ target, project, onPatch, onClose }: ProjectMenuProps) {
  const router = useRouter();
  const past = target.kind === "past";
  // What the pop-up opened with — closing saves only when something changed.
  const [opened] = useState(() => ({ name: project.name, line: project.line, url: project.url, year: project.year ? String(project.year) : "", status: project.status ?? "live" }));
  const [f, setF] = useState(opened);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, startBusy] = useTransition();
  const dialog = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // "Check again" refreshed the page: show what came back.
  const [seen, setSeen] = useState(project);
  if (seen !== project) {
    setSeen(project);
    if (project.name !== seen.name || project.line !== seen.line) setF((x) => ({ ...x, name: project.name, line: project.line }));
  }

  const title = f.name || domainOf(f.url) || "Project";
  const dirty = JSON.stringify(f) !== JSON.stringify(opened);

  function set(patch: Partial<typeof f>) {
    const next = { ...f, ...patch };
    setF(next);
    setNote("");
    const year = Number(next.year);
    onPatch({ name: next.name, line: next.line, url: next.url, ...(past && { year: year >= 1990 && year <= 2100 ? year : null, status: next.status as PastStatus }) });
  }

  function close() {
    if (busy) return;
    if (!dirty) return onClose();
    startBusy(async () => {
      const year = Number(f.year);
      const r = await updateProject({
        target,
        fields: { name: f.name, line: f.line, url: f.url, ...(past && { year: f.year ? (year >= 1990 && year <= 2100 ? year : null) : null, status: f.status }) },
      });
      if (r.error) {
        setNote(r.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  // Escape closes (and saves); Tab stays inside the pop-up; focus goes back where it was.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const all = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([type=file]), textarea, a[href]")];
    const [first, last] = [all[0], all[all.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function act(run: () => Promise<{ error?: string; note?: string; ok?: boolean }>, working: string, done?: string) {
    setNote(working);
    startBusy(async () => {
      const r = await run();
      setNote(r.error ?? r.note ?? done ?? "");
      if (r.ok) router.refresh();
    });
  }

  async function upload(picked: File) {
    if (!ACCEPT.includes(picked.type)) return setNote("PNG, JPG or WebP only.");
    if (picked.size > 2 * 1024 * 1024) return setNote("That picture is over 2 MB — try a smaller one.");
    act(async () => {
      const body = new FormData();
      body.set("target", JSON.stringify(target));
      body.set("file", picked);
      const res = await fetch("/api/project-picture", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
      if (!res.ok || !data.imageUrl) return { error: data.error ?? "Couldn’t upload — try again." };
      onPatch({ imageUrl: data.imageUrl });
      return { ok: true, note: "Using your picture." };
    }, "Uploading…");
  }

  function remove() {
    startBusy(async () => {
      const r = await removeProject(target);
      if (r.error) {
        setNote(r.error);
        setConfirming(false);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className={cx("pp-scrim")} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialog} className={cx("pp-dialog")} role="dialog" aria-modal="true" aria-labelledby="pp-title" onKeyDown={onKeyDown}>
        <button className={cx("pp-close")} type="button" aria-label="Close" onClick={close} disabled={busy}>
          ✕
        </button>
        <form className={cx("pp")} noValidate onSubmit={(e) => (e.preventDefault(), close())}>
          <h2 id="pp-title">{title}</h2>
          <div>
            <label htmlFor="pp-name">Name</label>
            <input type="text" id="pp-name" maxLength={40} value={f.name} placeholder={domainOf(f.url)} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pp-line">Description</label>
            <textarea id="pp-line" maxLength={80} value={f.line} onChange={(e) => set({ line: e.target.value })} />
            <span className={cx("hint")}>Shown under the name on your page, not on the picture.</span>
          </div>
          <div className={cx(past ? "pp-row" : "")}>
            <div>
              <label htmlFor="pp-url">Link</label>
              <input type="url" id="pp-url" inputMode="url" value={f.url} spellCheck={false} onChange={(e) => set({ url: e.target.value })} />
            </div>
            {past && (
              <div>
                <label htmlFor="pp-year">Year</label>
                <input type="text" id="pp-year" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </div>
            )}
          </div>
          {past && (
            <div>
              <span className={cx("lab")} id="pp-status">
                Status
              </span>
              <div className={cx("px-seg")} role="radiogroup" aria-labelledby="pp-status">
                {(Object.keys(PAST_STATUS) as PastStatus[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={f.status === k} onClick={() => set({ status: k })}>
                    {PAST_STATUS[k]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={cx("pp-pic")}>
            <button className={cx("px-ghost")} type="button" disabled={busy} onClick={() => file.current?.click()}>
              ↑ Use my own picture
            </button>
            {isOwnPicture(project.imageUrl) && (
              <button className={cx("px-text")} type="button" disabled={busy} onClick={() => act(() => restoreSitePicture(target), "Reading the site’s picture…")}>
                Use the site’s picture
              </button>
            )}
            <input
              ref={file}
              type="file"
              accept={ACCEPT.join(",")}
              hidden
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (picked) void upload(picked);
              }}
            />
          </div>
          <p className={cx("pp-note")} aria-live="polite">
            {note || (dirty ? "Saved when you close this." : "")}
          </p>
          <div className={cx("pp-foot")}>
            <button
              className={cx("px-text")}
              type="button"
              disabled={busy || dirty || !project.url}
              title={dirty ? "Close to save your edits first" : undefined}
              onClick={() => act(() => refreshProject(target), `Checking ${domainOf(project.url)}…`)}
            >
              ↻ Check again
            </button>
            {f.url && (
              <a className={cx("px-text")} href={/^https?:\/\//i.test(f.url) ? f.url : `https://${f.url}`} target="_blank" rel="noopener noreferrer">
                ↗ Open
              </a>
            )}
            {confirming ? (
              <span className={cx("pp-confirm")}>
                Remove {title}?
                <button className={cx("yes")} type="button" disabled={busy} onClick={remove} autoFocus>
                  Yes, remove
                </button>
                <button className={cx("px-text")} type="button" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button className={cx("pp-rm")} type="button" disabled={busy} onClick={() => setConfirming(true)}>
                🗑 Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
