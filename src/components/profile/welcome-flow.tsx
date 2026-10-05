"use client";

import { useEffect, useRef, useState } from "react";

import { finishProfile, saveDraft, saveWelcome } from "@/app/actions/onboarding";
import { peekPendingType } from "@/lib/pending-action";
import { withProject } from "@/lib/profile/draft";
import { draftProfile } from "@/lib/profile/draft-profile";
import type { ProfileEdit } from "@/lib/profile/options";
import type { ProfileV2 } from "@/lib/profile/queries";

import { InlineEdit, type InlineField } from "./inline-edit";
import { OnboardingStepper } from "./onboarding-stepper";
import { editFromProfile, profileWithEdit } from "./profile-editor";
import { ProfileView, cx } from "./profile-view";
import { StepHistory } from "./step-history";
import { StepInterests } from "./step-interests";
import { StepYou } from "./step-you";
import { YoureIn } from "./youre-in";

// Onboarding v2 — Welcome → Looking good? → You → Interests → History →
// "⚡ You're in." (DECISIONS.md § 2026-10-05 "Onboarding v2"). Finishing makes
// the free public profile; only then do this account's votes count.

export type { WelcomeMe } from "@/lib/profile/draft-profile";
import type { WelcomeMe } from "@/lib/profile/draft-profile";

interface WelcomeFlowProps {
  me: WelcomeMe;
  email: string;
  draft: ProfileEdit;
  /** An existing creator this account auto-claimed: "This is you ✓". */
  claimed: ProfileV2 | null;
  /** Where to go after, when a vote is waiting there (…?resume=1). */
  next: string;
  /** PREVIEW_MOCK=1 and nobody signed in: click through, nothing saved. */
  sample: boolean;
}

type Step = "welcome" | 0 | 1 | 2 | 3 | "in";

export function WelcomeFlow({ me, email: initialEmail, draft: initialDraft, claimed, next, sample }: WelcomeFlowProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState(initialEmail);
  const [building, setBuilding] = useState(claimed?.workUrl ?? initialDraft.projectUrl);
  const [errors, setErrors] = useState<{ email?: string; building?: string; form?: string }>({});
  const [draft, setDraft] = useState<ProfileEdit>(() => (claimed ? editFromProfile(claimed) : initialDraft));
  const [inline, setInline] = useState<InlineField | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ to: string; pending: ReturnType<typeof peekPendingType> } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = me.name.split(" ")[0];

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function go(s: Step) {
    setStep(s);
    setInline(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function change(d: ProfileEdit) {
    setDraft(d);
    if (sample) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveDraft(d), 600);
  }

  async function continueWelcome(e: React.FormEvent) {
    e.preventDefault();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    // The project is optional (D9): someone who only votes needs no project.
    const okBuild = !building.trim() || (building.trim().length > 3 && building.includes("."));
    setErrors({
      email: okEmail ? undefined : "That email looks off — check for a typo.",
      building: okBuild ? undefined : "That link looks off — try something like yourproduct.com, or leave it empty.",
    });
    if (!okEmail || !okBuild) return;
    let d: ProfileEdit;
    try {
      d = withProject(draft, building);
    } catch {
      return setErrors({ building: "That link looks off — try something like yourproduct.com, or leave it empty." });
    }
    setDraft(d);
    if (!sample) {
      setBusy(true);
      const r = await saveWelcome({ email, projectUrl: building });
      setBusy(false);
      if (r.error) return setErrors({ form: r.error });
      if (!claimed && r.draft) setDraft(r.draft);
      void saveDraft(d);
    }
    go(0);
  }

  async function finish() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setBusy(true);
    const r = sample ? {} : await finishProfile(draft);
    setBusy(false);
    if ("error" in r && r.error) return setErrors({ form: r.error });
    // A vote was waiting: back to it (it replays and now counts). Otherwise the profile.
    const resume = next.includes("resume=1");
    const handle = ("username" in r && r.username) || claimed?.username || me.handle;
    setDone({ to: resume || sample ? next : `/c/${handle}`, pending: resume ? peekPendingType() : null });
    setStep("in");
  }

  if (step === "in" && done) {
    return (
      <div className={cx("root")}>
        <YoureIn to={done.to} pending={done.pending} />
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div className={cx("root")}>
        <div className={cx("px-welcome")}>
          <p className={cx("eyebrow")}>You’re in</p>
          <h1>Welcome, {first} 👋</h1>
          <div className={cx("px-me")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- X avatar */}
            {me.avatar ? <img src={me.avatar} alt="" /> : null}
            <div>
              <b>{me.name} ⚡</b>
              <small>@{me.handle}</small>
              <span className={cx("ob-connected")}>✓ Connected with X</span>
            </div>
          </div>
          <form className={cx("px-form")} noValidate onSubmit={(e) => void continueWelcome(e)}>
            <div className={cx("px-field")}>
              <label htmlFor="px-email">Email</label>
              <input id="px-email" type="email" inputMode="email" autoComplete="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <span className={cx("hint")}>
                <span>Private. Only used for important Underhyped updates.</span>
              </span>
              {errors.email && <span className={cx("err")}>{errors.email}</span>}
            </div>
            <div className={cx("px-field")}>
              <label htmlFor="px-build">
                What are you cooking right now? <small>(optional)</small>
              </label>
              <input id="px-build" type="url" inputMode="url" placeholder="https://underhyped.wtf" value={building} onChange={(e) => setBuilding(e.target.value)} />
              {errors.building && <span className={cx("err")}>{errors.building}</span>}
            </div>
            {errors.form && <span className={cx("err")}>{errors.form}</span>}
            <button className={cx("px-lime")} type="submit" disabled={busy}>
              {busy ? "Saving…" : "Build my profile →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const at = step as 0 | 1 | 2 | 3;
  return (
    <div className={cx("root")}>
      <OnboardingStepper at={at} onGo={(i) => go(i as 0 | 1 | 2 | 3)} />

      {at === 0 && (
        <div className={cx("ob-step")}>
          <header className={cx("px-look-head")}>
            {claimed ? (
              <>
                <h1>
                  This is you <span className={cx("ok")}>✓</span>
                </h1>
                <p>We matched @{me.handle} to your Underhyped profile. Your Aura, battles and Hype are all kept.</p>
              </>
            ) : (
              <>
                <h1>Looking good?</h1>
                <p>We pulled this from your X profile. Change anything that feels off.</p>
              </>
            )}
          </header>
          <div className={cx("px-frame")}>
            <span className={cx("px-frame-tag")}>Preview · how people will see you</span>
            <ProfileView
              profile={claimed ? profileWithEdit(claimed, draft) : draftProfile(me, draft)}
              preview
              inline={{
                open: inline,
                onOpen: (f) => setInline(inline === f ? null : f),
                form: inline && <InlineEdit field={inline} draft={draft} onChange={change} onDone={() => setInline(null)} />,
              }}
            />
          </div>
          <div className={cx("px-actions")}>
            <button className={cx("px-lime")} type="button" onClick={() => go(1)}>
              Looks good →
            </button>
            <button className={cx("px-text")} type="button" onClick={() => go(1)}>
              I’ll edit this later
            </button>
          </div>
        </div>
      )}
      {at === 1 && <StepYou draft={draft} onChange={change} onNext={() => go(2)} />}
      {at === 2 && <StepInterests draft={draft} onChange={change} onNext={() => go(3)} />}
      {at === 3 && <StepHistory draft={draft} onChange={change} onFinish={() => void finish()} busy={busy} />}

      {errors.form && (
        <p className={cx("ob-err")} role="alert">
          {errors.form}
        </p>
      )}
    </div>
  );
}
