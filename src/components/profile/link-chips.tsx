"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveMyLinks } from "@/app/actions/profile";
import { domainOf } from "@/lib/profile/draft";
import { ADD_ANOTHER, ALWAYS_SHOWN, githubFromLink, LINK_NAME, shortLink, type EditableLink } from "@/lib/profile/links";

import { cx } from "./profile-view";

// The owner's link chips, edited in place (Underhyped Arena artifact v71).
// X is locked to the sign-in; GitHub is "github.com/" + a username; every
// other link is pasted whole. One Save for all of them, gone once saved.

const GLYPH: Record<EditableLink, string> = { github: "⌥", linkedin: "in", web: "🌐", instagram: "◎", youtube: "▶", tiktok: "♪", producthunt: "P" };

interface LinkChipsProps {
  handle: string;
  socials: Record<string, string>;
  /** The Currently cooking link, shown as a plain chip at the end. */
  projectHref: string | null;
  onSaved: (socials: Record<string, string>) => void;
}

export function LinkChips({ handle, socials, projectHref, onSaved }: LinkChipsProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<Record<EditableLink, string>>>({});
  const [editingKind, setEditingKind] = useState<EditableLink | null>(null);
  const [added, setAdded] = useState<EditableLink | null>(null);
  const [menu, setMenu] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<EditableLink, string>>>({});
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const focusKind = useRef<EditableLink | null>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  const dirty = Object.keys(draft).length > 0;
  const shown = [...ALWAYS_SHOWN, ...ADD_ANOTHER.filter((k) => socials[k] || added === k)];
  const left = ADD_ANOTHER.filter((k) => !shown.includes(k));

  useEffect(() => {
    if (!focusKind.current) return;
    document.querySelector<HTMLInputElement>(`[data-chip="${focusKind.current}"] input`)?.focus();
    focusKind.current = null;
  });

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  function type(kind: EditableLink, value: string) {
    setDraft((d) => ({ ...d, [kind]: value }));
    setErrors((e) => ({ ...e, [kind]: undefined }));
    setNote(null);
  }

  function undo(kind: EditableLink) {
    setDraft((d) => {
      const rest = { ...d };
      delete rest[kind];
      return rest;
    });
    setErrors((e) => ({ ...e, [kind]: undefined }));
    if (editingKind === kind) setEditingKind(null);
    if (added === kind && !socials[kind]) setAdded(null);
  }

  function save() {
    if (!dirty || pending) return;
    startTransition(async () => {
      const r = await saveMyLinks(draft);
      if (r.errors) {
        setErrors(r.errors);
        setNote(Object.values(r.errors)[0] ?? null);
        return;
      }
      if (r.error || !r.socials) {
        setNote(r.error ?? "Couldn’t save — try again.");
        return;
      }
      setDraft({});
      setEditingKind(null);
      setAdded(null);
      setNote("Links saved.");
      onSaved(r.socials);
      router.refresh();
    });
  }

  const keys = (kind: EditableLink) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      undo(kind);
    }
  };

  function chip(kind: EditableLink) {
    const g = (
      <span className={cx("g")} aria-hidden="true">
        {GLYPH[kind]}
      </span>
    );
    const bad = errors[kind] ? " bad" : "";
    if (kind === "github") {
      const user = draft.github ?? githubFromLink(socials.github);
      return (
        <label key={kind} className={cx(`pf-sl${bad}`)} data-chip={kind}>
          {g}
          <span className={cx("pre")}>github.com/</span>
          <input
            type="text"
            value={user}
            placeholder="you"
            size={Math.max(user.length, 3) + 1}
            spellCheck={false}
            autoComplete="off"
            aria-label="GitHub username"
            aria-invalid={!!errors.github}
            onChange={(e) => type("github", e.target.value)}
            onKeyDown={keys("github")}
          />
        </label>
      );
    }
    const url = socials[kind] ?? "";
    if (url && editingKind !== kind && draft[kind] === undefined) {
      return (
        <button
          key={kind}
          type="button"
          className={cx("pf-sl filled")}
          title={`Edit your ${LINK_NAME[kind]} link`}
          onClick={() => {
            focusKind.current = kind;
            setEditingKind(kind);
          }}
        >
          {g}
          <span className={cx("v")}>{shortLink(url)}</span>
          <span className={cx("ok")} aria-hidden="true">
            ✓
          </span>
        </button>
      );
    }
    return (
      <label key={kind} className={cx(`pf-sl editing${bad}`)} data-chip={kind}>
        {g}
        <input
          type="url"
          inputMode="url"
          value={draft[kind] ?? (url ? shortLink(url) : "")}
          placeholder={`Paste your ${LINK_NAME[kind]} link`}
          spellCheck={false}
          autoComplete="off"
          aria-label={`Your ${LINK_NAME[kind]} link`}
          aria-invalid={!!errors[kind]}
          onChange={(e) => type(kind, e.target.value)}
          onKeyDown={keys(kind)}
        />
      </label>
    );
  }

  return (
    <div className={cx("pf-links pf-links-own")}>
      <span className={cx("pf-sl locked")} title="From your X sign-in — can’t be changed">
        <span className={cx("g")} aria-hidden="true">
          𝕏
        </span>
        <span className={cx("pre")}>x.com/</span>
        <b>{handle}</b>
        <span className={cx("lock")} aria-hidden="true">
          🔒
        </span>
      </span>
      {shown.map(chip)}
      {left.length > 0 && (
        <span className={cx("pf-sl-add")} ref={menuRef}>
          <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            + Add another
          </button>
          {menu && (
            <span className={cx("pf-sl-menu")} role="menu">
              {left.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setAdded(k);
                    focusKind.current = k;
                  }}
                >
                  <span className={cx("g")}>{GLYPH[k]}</span>
                  {LINK_NAME[k]}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
      {projectHref && (
        <a href={projectHref} target="_blank" rel="noopener noreferrer">
          <span className={cx("g")} aria-hidden="true">
            🔗
          </span>
          {domainOf(projectHref)}
        </a>
      )}
      {dirty && (
        <button type="button" className={cx("pf-sl-saveall")} onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      )}
      {note && (
        <p className={cx("pf-sl-note")} role="status">
          {note}
        </p>
      )}
    </div>
  );
}
