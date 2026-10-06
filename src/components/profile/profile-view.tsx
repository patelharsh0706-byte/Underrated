"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { startArenaCheckout } from "@/app/actions/onboarding";
import { getMyProfileState, hypeCreator, updateMyProfile } from "@/app/actions/profile";
import { SignInGate } from "@/components/auth/sign-in-gate";
import { consumeResumeFlag, onboardingHref, resumeHere, savePending, takePending } from "@/lib/pending-action";
import { domainOf } from "@/lib/profile/draft";
import { meetPhrase, PAST_STATUS, type ProfileEdit } from "@/lib/profile/options";
import type { ProfileV2 } from "@/lib/profile/queries";
import { dicebearUrl } from "@/lib/unavatar";

import type { InlineField } from "./inline-edit";
import { ProfileEditor, editFromProfile, profileWithEdit } from "./profile-editor";
import s from "./profile.module.css";

// Profile v2 — a 1:1 port of the approved prototype's profile (Underhyped
// Arena artifact, v58). Used by /c/[username] and the "Looking good?" preview.

export const cx = (names: string) =>
  names
    .split(" ")
    .filter(Boolean)
    .map((n) => s[n] ?? n)
    .join(" ");

const LINK: Record<string, [string, string]> = {
  twitter: ["𝕏", "Say hi on X"],
  github: ["⌥", "GitHub"],
  linkedin: ["in", "LinkedIn"],
  instagram: ["◎", "Instagram"],
  youtube: ["▶", "YouTube"],
  tiktok: ["♪", "TikTok"],
  spotify: ["♫", "Spotify"],
  web: ["🌐", "Website"],
};
const PALETTE = ["#6B5BD6", "#C4399E", "#1D8E45", "#2F6BE0", "#B4603A", "#0F7B7B", "#E0A100", "#111111"];
const colorFor = (name: string) => PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

interface ProfileViewProps {
  profile: ProfileV2;
  /** "Looking good?" preview: no top bar, no stats, no Hype, no listeners. */
  preview?: boolean;
  /** The ✎ edits on "Looking good?": which field is open, and its form. */
  inline?: { open: InlineField | null; onOpen: (f: InlineField) => void; form: ReactNode };
}

export function ProfileView({ profile: initial, preview = false, inline }: ProfileViewProps) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [own, setOwn] = useState(false);
  const [hyped, setHyped] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<ProfileEdit | null>(null);
  const [gate, setGate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // A new profile from the parent (preview typing, router.refresh) replaces
  // the local copy — React's "adjust state when a prop changes" pattern.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setP(initial);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function doHype() {
    const r = await hypeCreator({ creatorId: p.id });
    if (r.needsSignIn) {
      savePending({ type: "hype", creatorId: p.id });
      setGate(true);
      return;
    }
    if (r.needsProfile) {
      savePending({ type: "hype", creatorId: p.id });
      router.push(onboardingHref());
      return;
    }
    if (r.error) return setToast(r.error);
    setHyped(true);
    if (r.counted) {
      setP((cur) => ({ ...cur, hype: cur.hype + 1 }));
      setToast(`⚡ +1 Hype for ${p.name.split(" ")[0]}. Aura and rank don’t change.`);
    } else setToast(`You already hyped ${p.name.split(" ")[0]}. One Hype per account.`);
  }

  // Who's looking (owner? already hyped?) — resolved in the browser so the
  // page itself stays cached. Then replay a Hype attempted before sign-in.
  useEffect(() => {
    if (preview) return;
    let alive = true;
    void getMyProfileState({ creatorId: initial.id }).then((st) => {
      if (!alive) return;
      const mine = st.myUsername?.toLowerCase() === initial.username.toLowerCase();
      setOwn(mine);
      setHyped(st.hyped);
      // Back from the $3 checkout (Dodo return_url).
      const url = new URL(window.location.href);
      if (url.searchParams.get("paid") === "1") {
        url.searchParams.delete("paid");
        window.history.replaceState(null, "", url.pathname + url.search);
        if (mine) setToast("🔥 Payment received — you’ll be in the Arena within a minute.");
      }
      if (st.signedIn && consumeResumeFlag()) {
        const pending = takePending("hype");
        if (pending?.type === "hype" && pending.creatorId === initial.id && !st.hyped) void doHype();
      }
    });
    return () => {
      alive = false;
    };
    // doHype reads the latest profile through setP; run once per profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, initial.id, initial.username]);

  const first = p.name.split(" ")[0];
  const ranked = p.rank !== null;
  const rate = p.battlesCount ? Math.round((p.winsCount / p.battlesCount) * 100) : 0;
  const view = editing ? profileWithEdit(p, editing) : p;
  const links = Object.entries(p.socials ?? {});
  const projectName = view.projectName || (view.workUrl ? domainOf(view.workUrl) : "");

  function share() {
    const url = `${window.location.origin}/c/${p.username}`;
    navigator.clipboard?.writeText(url).then(
      () => setToast(`Link copied: ${url.replace(/^https?:\/\//, "")}`),
      () => setToast(url),
    );
  }

  async function enterArena() {
    setPaying(true);
    const r = await startArenaCheckout();
    if (r.payUrl) return window.location.assign(r.payUrl);
    setPaying(false);
    setToast(r.error ?? "Couldn’t start checkout — try again in a minute.");
  }

  // ✎ next to a field on "Looking good?"; the open field shows its form instead.
  const pencil = (f: InlineField, label: string) =>
    inline && (
      <button type="button" className={cx("ob-pencil")} aria-label={`Edit ${label}`} aria-expanded={inline.open === f} onClick={() => inline.onOpen(f)}>
        ✎
      </button>
    );
  const formFor = (f: InlineField) => (inline?.open === f ? inline.form : null);

  // Edit profile swaps the whole page for the form, opened from the top;
  // Save (or Cancel) swaps back to the profile, again from the top.
  function openEditor() {
    setEditing(editFromProfile(p));
    window.scrollTo({ top: 0 });
  }
  function closeEditor() {
    setEditing(null);
    window.scrollTo({ top: 0 });
  }

  async function saveEdits() {
    if (!editing) return;
    const r = await updateMyProfile(editing);
    if (r.error) return setToast(r.error);
    setP(profileWithEdit(p, editing));
    closeEditor();
    setToast("Saved.");
    router.refresh();
  }

  const battlesBtn = (
    <button
      type="button"
      className={cx(`pf-battles ${historyOpen ? "is-open" : ""}`)}
      aria-expanded={historyOpen}
      onClick={() => !preview && setHistoryOpen((o) => !o)}
    >
      ⚔️ {p.battlesCount.toLocaleString("en-US")} battles <i aria-hidden="true">▾</i>
    </button>
  );
  const small = (
    <div className={cx("pf-small")}>
      {battlesBtn}
      <span>⚡ {p.hype.toLocaleString("en-US")} Hype</span>
    </div>
  );
  const styleChips = [view.workHow, view.workStage, view.workCareer].filter(Boolean) as string[];
  const meetShort = meetPhrase(view.wantsToMeet);
  const hasKv = styleChips.length || meetShort || view.openTo.length || view.into.length;

  if (editing && !preview) {
    return (
      <div className={cx("root")}>
        <div className={cx("pf")}>
          <div className={cx("pf-top")}>
            <button className={cx("px-text")} type="button" onClick={closeEditor}>
              ← Back to profile
            </button>
          </div>
          <ProfileEditor value={editing} onChange={setEditing} onDone={() => void saveEdits()} doneLabel="Save" onCancel={closeEditor} />
        </div>
        {toast && (
          <div className={cx("px-toast-inline")} role="status">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cx("root")}>
      <div className={cx("pf")}>
        {!preview && (
          <div className={cx("pf-top")}>
            <Link className={cx("px-text")} href="/leaderboard">
              ← Back to leaderboard
            </Link>
            <div className={cx("right")}>
              {own && (
                <button className={cx("px-ghost")} type="button" onClick={openEditor}>
                  Edit profile
                </button>
              )}
              <button className={cx("px-ghost")} type="button" onClick={share}>
                Share ↗
              </button>
            </div>
          </div>
        )}

        <div className={cx("pf-id")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatars live on Blob/X; sized by CSS */}
          <img className={cx("pf-photo")} src={p.avatarUrl ?? dicebearUrl(p.username)} alt={p.name} />
          <div>
            <h1>{p.name}</h1>
            <p className={cx("pf-at")}>@{p.username}</p>
            {view.tagline && <p className={cx("pf-tag")}>{view.tagline}</p>}
            {formFor("location") ??
              ((view.location && !view.locationHidden) || inline ? (
                <p className={cx("pf-loc")}>
                  {view.location && !view.locationHidden ? view.location : view.location ? "Location hidden" : "Add your location"}
                  {pencil("location", "location")}
                </p>
              ) : null)}
            {links.length > 0 && (
              <div className={cx("pf-links")}>
                {links.map(([kind, href]) => {
                  const [glyph, label] = LINK[kind] ?? LINK.web;
                  const dm = kind === "twitter" && p.xUserId ? `https://x.com/messages/compose?recipient_id=${encodeURIComponent(p.xUserId)}` : href;
                  return (
                    <a key={kind} href={dm} target="_blank" rel="noopener noreferrer" title={kind === "twitter" ? `Message @${p.username} on X` : undefined}>
                      <span className={cx("g")} aria-hidden="true">
                        {glyph}
                      </span>
                      {label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!preview && !p.inArena && own && (
          <div className={cx("ob-arena")}>
            <p>
              <b>Think you’re underhyped?</b> Enter the Arena and find out.
            </p>
            <button className={cx("px-lime")} type="button" disabled={paying} onClick={() => void enterArena()}>
              {paying ? "Opening checkout…" : "Enter the Arena →"}
            </button>
            <small>$3 once. Battles, Aura and a rank — your profile stays free either way.</small>
          </div>
        )}

        {!preview && p.inArena && (
          <div className={cx("pf-status")}>
            {ranked ? (
              <>
                <div className={cx("pf-big")}>
                  <div className={cx("aura")}>
                    <b>🔥 {p.aura.toLocaleString("en-US")}</b>
                    <small>Aura</small>
                  </div>
                  <div>
                    <b>#{p.rank}</b>
                    <small>Rank</small>
                  </div>
                  <div>
                    <b>{rate}%</b>
                    <small>Win rate</small>
                  </div>
                </div>
                {small}
              </>
            ) : (
              <div className={cx("pf-new")}>
                <span className={cx("chal")}>🔥 New challenger</span>
                <p>
                  {p.aura.toLocaleString("en-US")} Aura · {Math.min(p.battlesCount, 10)}/10 placement battles
                </p>
                <div className={cx("pf-bar")}>
                  <i style={{ width: `${Math.min(100, p.battlesCount * 10)}%` }} />
                </div>
                {small}
              </div>
            )}
            <div className={cx("pf-history")} hidden={!historyOpen}>
              <h3>Recent battles</h3>
              {p.activity.length ? (
                <ul className={cx("pf-feed")}>
                  {p.activity.map((a, i) => (
                    <li key={i}>
                      <span className={cx("ic")} aria-hidden="true">
                        {a.icon}
                      </span>
                      <span>{a.text}</span>
                      <time>{a.when}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No battles yet. The first ones start after entering the Arena.</p>
              )}
            </div>
          </div>
        )}

        {!preview && (
        <div className={cx("pf-cta")}>
          {own ? (
            <button className={cx("px-ghost")} type="button" onClick={share}>
              Share your profile ↗
            </button>
          ) : (
            <button className={cx(`px-lime ${hyped ? "done" : ""}`)} type="button" onClick={() => void doHype()}>
              {hyped ? "⚡ Hyped ✓" : `⚡ Hype ${first}`}
            </button>
          )}
        </div>
        )}

        {(view.about || hasKv || inline) && (
          <section className={cx("pf-box pf-sec")}>
            <h2 className={cx("pf-box-h")}>
              About {first}
              {pencil("about", "About")}
            </h2>
            {formFor("about") ?? (view.about ? <p className={cx("pf-about")}>{view.about}</p> : inline ? <p className={cx("pf-sub")}>A line or two about you.</p> : null)}
            {view.about && hasKv ? <hr className={cx("pf-rule")} /> : null}
            {hasKv ? (
              <div className={cx("pf-kv")}>
                {(styleChips.length > 0 || meetShort) && (
                  <div className={cx("pf-kv-row")}>
                    <h3 className={cx("pf-h3")}>Working style</h3>
                    <div className={cx("pf-chips")}>
                      {styleChips.map((t) => (
                        <span key={t} className={cx("pf-chip ws")}>
                          {t}
                        </span>
                      ))}
                      {meetShort && <span className={cx("pf-chip ws-meet")}>Wants to meet {meetShort}</span>}
                    </div>
                  </div>
                )}
                {view.openTo.length > 0 && (
                  <div className={cx("pf-kv-row")}>
                    <h3 className={cx("pf-h3")}>Open to</h3>
                    <div className={cx("pf-chips")}>
                      {view.openTo.map((t) => (
                        <span key={t} className={cx("pf-chip open")}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {view.into.length > 0 && (
                  <div className={cx("pf-kv-row")}>
                    <h3 className={cx("pf-h3")}>Into</h3>
                    <div className={cx("pf-chips")}>
                      {view.into.map((t) => (
                        <span key={t} className={cx("pf-chip")}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}

        {(view.workUrl || view.past.length > 0 || own || inline) && (
          <div className={cx("pf-box pf-cook")}>
            {formFor("project") && (
              <section className={cx("pf-sec")}>
                <h2>🍳 Currently cooking</h2>
                {formFor("project")}
              </section>
            )}
            {!formFor("project") && inline && !view.workUrl && (
              <section className={cx("pf-sec")}>
                <h2>
                  🍳 Currently cooking
                  {pencil("project", "current project")}
                </h2>
                <p className={cx("pf-sub")}>Add what you’re building right now.</p>
              </section>
            )}
            {!formFor("project") && view.workUrl && (
              <section className={cx("pf-sec")}>
                <h2>
                  🍳 Currently cooking
                  {pencil("project", "current project")}
                </h2>
                <a className={cx("pf-proj big")} href={view.workUrl} target="_blank" rel="noopener noreferrer">
                  <span className={cx("pf-logo")} style={{ background: colorFor(projectName || "x") }} aria-hidden="true">
                    {(projectName || "?").charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <b>{projectName}</b>
                    {view.projectTagline && <span>{view.projectTagline}</span>}
                    <small>{domainOf(view.workUrl)}</small>
                  </span>
                  <span className={cx("arr")} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </section>
            )}
            {view.workUrl && (view.past.length > 0 || (own && !preview)) ? <hr className={cx("pf-rule")} /> : null}
            {(view.past.length > 0 || (own && !preview)) && (
              <section className={cx("pf-sec pf-past")}>
                <h2>👨‍🍳 Previously cooked</h2>
                <p className={cx("pf-sub")}>
                  {view.past.length ? "Things I’ve built, shipped, killed and learned from." : "Nothing here yet. Add what you’ve built before from Edit profile."}
                </p>
                {view.past.length > 0 && (
                  <div className={cx("pf-rows")}>
                    {view.past.map((x, i) => (
                      <a key={`${x.name}-${i}`} className={cx("pf-row")} hidden={i >= 3 && !showAll} href={x.url || undefined} target="_blank" rel="noopener noreferrer">
                        <span className={cx("pf-logo sm")} style={{ background: colorFor(x.name) }} aria-hidden="true">
                          {x.name.charAt(0).toUpperCase()}
                        </span>
                        <span className={cx("txt")}>
                          <b>{x.name}</b>
                          {x.line && <span>{x.line}</span>}
                          <small>
                            {x.year ?? ""} <em className={cx(`pill st-${x.status}`)}>{PAST_STATUS[x.status]}</em>
                          </small>
                        </span>
                        <span className={cx("arr")} aria-hidden="true">
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {view.past.length > 3 && !showAll && (
                  <button className={cx("px-text pf-all")} type="button" onClick={() => setShowAll(true)}>
                    Show all {view.past.length} ↓
                  </button>
                )}
              </section>
            )}
          </div>
        )}

        {own && !preview && (
          <div className={cx("ob-bottom-edit")}>
            <button className={cx("px-ghost")} type="button" onClick={openEditor}>
              Edit profile
            </button>
          </div>
        )}
      </div>

      {gate && <SignInGate variant="hype" next={resumeHere()} onClose={() => setGate(false)} />}
      {toast && (
        <div className={cx("px-toast-inline")} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
