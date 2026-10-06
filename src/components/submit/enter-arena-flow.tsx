"use client";

import { useState } from "react";

import { startArenaCheckout } from "@/app/actions/onboarding";
import { MarkerSwipe } from "@/components/marker-swipe";
import { SUBMISSION_FEE_CENTS } from "@/lib/creator-schema";
import { cn } from "@/lib/utils";

// Derived, not hardcoded — the fee lives in one place and a literal here
// would be free to drift from the real charge.
const FEE = `$${(SUBMISSION_FEE_CENTS / 100).toFixed(SUBMISSION_FEE_CENTS % 100 === 0 ? 0 : 2)}`;

// "Enter the Arena" for someone signed in with a finished profile
// (DECISIONS.md § 2026-10-06). The X profile is the one they signed in with,
// so it's shown locked; the project link comes from their profile and can be
// changed here. The button goes straight to the $3 checkout for their account.

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  error,
  ariaLabel,
  inputMode,
  readOnly,
}: {
  label: string;
  icon?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: string;
  ariaLabel: string;
  inputMode?: "url" | "text";
  readOnly?: boolean;
}) {
  return (
    <>
      <label className="block">
        <span className="mb-[7px] block font-display text-xs font-bold tracking-[0.1em] text-ink-soft uppercase">
          {label}
        </span>
        <span
          className={cn(
            "flex items-center gap-3 rounded-[14px] border bg-card px-4 py-1 transition-[border-color,box-shadow] duration-150",
            error
              ? "border-down shadow-[0_0_0_3px_rgb(220_59_64/0.14)]"
              : "border-hairline-2 focus-within:border-foreground focus-within:shadow-[0_0_0_3px_rgb(216_255_62/0.55)]",
          )}
        >
          {icon ? (
            <span className="w-[22px] flex-none text-center text-[17px]" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <input
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            maxLength={300}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent py-4 text-base text-foreground outline-none placeholder:text-ink-faint",
              readOnly && "cursor-default text-ink-soft",
            )}
          />
        </span>
      </label>
      <span className="block min-h-[18px] pt-1.5 text-[13px] text-down">{error ?? ""}</span>
    </>
  );
}

interface EnterArenaFlowProps {
  /** The X handle they signed in with. */
  handle: string;
  /** Their profile's project link, "" when none yet. */
  projectUrl: string;
}

export function EnterArenaFlow({ handle, projectUrl }: EnterArenaFlowProps) {
  const [work, setWork] = useState(projectUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""));
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function enter() {
    if (!work.trim()) return setError("Add a link to something you’ve made.");
    setError(undefined);
    setBusy(true);
    const r = await startArenaCheckout({ projectUrl: work });
    // External Dodo checkout: a full navigation, not an internal route.
    if (r.payUrl) return window.location.assign(r.payUrl);
    setBusy(false);
    setError(r.error ?? "Couldn’t start checkout — try again in a minute.");
  }

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <section>
        <div className="px-0 pt-10 pb-[30px] text-center">
          <p className="font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
            Enter the arena
          </p>
          <h1 className="mx-auto mt-3 max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
            Put yourself on the <MarkerSwipe>radar.</MarkerSwipe>
          </h1>
          <p className="mt-3.5 text-base text-ink-soft sm:text-lg">Two links. That’s the whole form.</p>
        </div>

        <Field label="Your X profile" icon="𝕏" value={`x.com/${handle}`} ariaLabel="Your X profile (the account you signed in with)" readOnly />

        <Field
          label="What are you building?"
          icon="↗"
          value={work}
          onChange={setWork}
          placeholder="yourproject.com"
          ariaLabel="Your project URL"
          inputMode="url"
          error={error}
        />

        <button
          type="button"
          onClick={() => void enter()}
          disabled={busy}
          className={cn(
            "mt-2 block w-full rounded-[14px] bg-primary px-5 py-[18px] font-display text-[17px] font-extrabold tracking-[-0.02em] text-primary-foreground transition-[transform,box-shadow,opacity] duration-150",
            busy
              ? "cursor-default opacity-55"
              : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-14px_rgb(17_17_17/0.75)] active:translate-y-0",
          )}
        >
          {busy ? "Opening checkout…" : "Enter the Arena →"}
        </button>
        <p className="mt-3 text-center text-[13px] text-ink-soft">Takes ~10 sec · {FEE} one-time</p>

        <span className="relative mt-10 block rotate-[-2deg] text-center font-hand text-[19px] font-bold tracking-[0.04em] text-ink-faint uppercase">
          good people deserve more hype.
          <svg width="190" height="9" viewBox="0 0 190 9" fill="none" aria-hidden="true" className="mx-auto mt-0.5 block max-w-full text-lime-deep">
            <path d="M3 6c44-5 120-6 184-2" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </span>
      </section>
    </div>
  );
}
