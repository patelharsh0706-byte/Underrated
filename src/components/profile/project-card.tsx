"use client";

import { useState } from "react";

import { domainOf } from "@/lib/profile/draft";
import { PAST_STATUS, type PastStatus } from "@/lib/profile/options";
import { colorFor } from "@/lib/project-mark";

import { cx } from "./profile-view";

// A project as a card — the approved prototype's (Underhyped Arena artifact,
// v71): the site's share picture on top (1.91:1), then logo · name · one line.
// No picture, or one that fails to load → a panel tinted with the project's
// colour and its letter. Never an empty box.

interface ProjectCardProps {
  href: string;
  name: string;
  line: string;
  imageUrl: string | null;
  logoUrl: string | null;
  status?: PastStatus;
  year?: number | null;
  /** The Currently cooking card: one line can wrap, the domain instead of the year. */
  big?: boolean;
  hidden?: boolean;
  /** Owner only: the ⋯ button that opens the pop-up. */
  onMenu?: () => void;
}

export function ProjectCard({ href, name, line, imageUrl, logoUrl, status, year, big = false, hidden, onMenu }: ProjectCardProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const color = colorFor(name || "x");
  const letter = (name || "?").charAt(0).toUpperCase();
  const site = href ? domainOf(href) : "";
  const meta = big ? site : [year, site].filter(Boolean).join(" · ");

  return (
    <div className={cx(`pf-card${big ? " big" : ""}`)} hidden={hidden}>
      {href && <a className={cx("pf-card-hit")} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`} />}
      <span className={cx("pf-card-img")}>
        {imageUrl && !imageBroken ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored Blob pictures, no remotePatterns
          <img src={imageUrl} alt="" loading="lazy" onError={() => setImageBroken(true)} />
        ) : (
          <span className={cx("pf-card-fb")} style={{ background: `${color}1f` }}>
            <span className={cx("pf-logo")} style={{ background: color }} aria-hidden="true">
              {letter}
            </span>
          </span>
        )}
        {status && <em className={cx(`pill st-${status} pf-card-pill`)}>{PAST_STATUS[status]}</em>}
      </span>
      <span className={cx("pf-card-body")}>
        <span className={cx("pf-logo")} style={{ background: logoUrl && !logoBroken ? "var(--surface)" : color }} aria-hidden="true">
          {logoUrl && !logoBroken ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored Blob logo
            <img src={logoUrl} alt="" loading="lazy" onError={() => setLogoBroken(true)} />
          ) : (
            letter
          )}
        </span>
        <span className={cx("txt")}>
          <b>{name}</b>
          {line && <span className={cx("ln")}>{line}</span>}
          {meta && <small>{meta}</small>}
        </span>
        <span className={cx("arr")} aria-hidden="true">
          ↗
        </span>
      </span>
      {onMenu && <MenuButton name={name} onClick={onMenu} />}
    </div>
  );
}

/** The round ⋯ on a card's picture (or at the end of a row) — owner only. */
export function MenuButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button className={cx("pf-card-menu")} type="button" aria-label={`Edit ${name}`} aria-haspopup="dialog" onClick={onClick}>
      ⋯
    </button>
  );
}
