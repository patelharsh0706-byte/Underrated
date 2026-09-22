"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { findNominee, submitNomination } from "@/app/actions/nominate";
import { MarkerSwipe } from "@/components/marker-swipe";
import { getCreatorAvatarUrl } from "@/lib/unavatar";
import { cn } from "@/lib/utils";

type Step = "form" | "loading" | "confirm" | "done";

interface Found {
  handle: string;
  avatar: string;
  existingUsername?: string;
}

function Field({
  value,
  onChange,
  placeholder,
  error,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  ariaLabel: string;
}) {
  return (
    <>
      <label className="block">
        <span className="mb-[7px] block font-display text-xs font-bold tracking-[0.1em] text-ink-soft uppercase">
          Their X profile
        </span>
        <span
          className={cn(
            "flex items-center gap-3 rounded-[14px] border bg-card px-4 py-1 transition-[border-color,box-shadow] duration-150",
            error
              ? "border-down shadow-[0_0_0_3px_rgb(220_59_64/0.14)]"
              : "border-hairline-2 focus-within:border-foreground focus-within:shadow-[0_0_0_3px_rgb(216_255_62/0.55)]",
          )}
        >
          <span className="w-[22px] flex-none text-center text-[17px]" aria-hidden="true">
            𝕏
          </span>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className="min-w-0 flex-1 border-0 bg-transparent py-4 text-base text-foreground outline-none placeholder:text-ink-faint"
          />
        </span>
      </label>
      <span className="block min-h-[18px] pt-1.5 text-[13px] text-down">{error ?? ""}</span>
    </>
  );
}

function BigButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "mt-2 block w-full rounded-[14px] bg-primary px-5 py-[18px] font-display text-[17px] font-extrabold tracking-[-0.02em] text-primary-foreground transition-[transform,box-shadow,opacity] duration-150",
        disabled
          ? "cursor-default opacity-55"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-14px_rgb(17_17_17/0.75)] active:translate-y-0",
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-3.5 block cursor-pointer text-sm text-ink-soft underline underline-offset-[3px] transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-center text-[13px] text-ink-soft">{children}</p>;
}

function StepHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 mb-5 text-center font-display text-[26px] font-extrabold tracking-[-0.035em]">
      {children}
    </h2>
  );
}

function PreviewCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card bg-card p-6 shadow-card">{children}</div>;
}

export function NominateFlow() {
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("form");
  const [xInput, setXInput] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [found, setFound] = useState<Found | null>(null);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleFind = useCallback(() => {
    setErr(undefined);
    setStep("loading");

    startTransition(async () => {
      const res = await findNominee({ xInput });
      if (res.error || !res.handle) {
        setErr(res.error ?? "That doesn’t look like an X profile link.");
        setStep("form");
        return;
      }

      setFound({
        handle: res.handle,
        avatar: getCreatorAvatarUrl(`https://x.com/${res.handle}`, res.handle),
        existingUsername: res.existingUsername,
      });
      setNote("");
      setSubmitError(undefined);
      setStep("confirm");
    });
  }, [xInput, startTransition]);

  const handleSend = useCallback(() => {
    if (!found) return;
    setSubmitError(undefined);

    startTransition(async () => {
      const res = await submitNomination({ xInput, note: note.trim() || undefined });
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      setStep("done");
    });
  }, [found, xInput, note, startTransition]);

  const restart = () => {
    setXInput("");
    setErr(undefined);
    setFound(null);
    setNote("");
    setSubmitError(undefined);
    setStep("form");
  };

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {step === "form" ? (
        <section>
          <div className="px-0 pt-10 pb-[30px] text-center">
            <p className="font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
              Nominate someone 🔥
            </p>
            <h1 className="mx-auto mt-3 max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              Who is the internet <MarkerSwipe>sleeping on?</MarkerSwipe>
            </h1>
            <p className="mt-3.5 text-base text-ink-soft sm:text-lg">
              Found a creator doing great work without getting the attention they deserve?
            </p>
          </div>

          <Field
            value={xInput}
            onChange={setXInput}
            placeholder="x.com/username"
            ariaLabel="Their X profile URL"
            error={err}
          />

          <BigButton onClick={handleFind} disabled={isPending}>
            Find creator →
          </BigButton>
          <Helper>It takes about 5 seconds. No account needed.</Helper>
        </section>
      ) : null}

      {step === "loading" ? (
        <section>
          <div className="pt-10 pb-[30px] text-center">
            <h1 className="mx-auto max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              Looking them <MarkerSwipe>up.</MarkerSwipe>
            </h1>
          </div>
          <PreviewCard>
            <p className="flex items-center justify-center gap-2.5 py-[46px] text-[14.5px] text-ink-soft">
              <span className="pulse-dot h-[9px] w-[9px] rounded-full bg-aura" aria-hidden="true" />
              <span>Reading their X profile…</span>
            </p>
          </PreviewCard>
        </section>
      ) : null}

      {step === "confirm" && found ? (
        <section>
          <StepHead>Is this them?</StepHead>

          <PreviewCard>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={found.avatar}
                alt=""
                className="h-[68px] w-[68px] flex-none rounded-full bg-muted object-cover"
              />
              <div className="min-w-0">
                <h3 className="font-display text-[21px] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">
                  @{found.handle}
                </h3>
                <a
                  href={`https://x.com/${found.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-px inline-block text-[14.5px] font-semibold text-ink-soft hover:text-foreground"
                >
                  𝕏 View on X
                </a>
              </div>
            </div>

            {found.existingUsername ? (
              <p className="mt-[18px] flex items-baseline gap-2.5 border-t border-hairline pt-[15px] text-sm leading-[1.45] text-ink-soft">
                <b className="flex-none text-aura">🔥</b>
                <span>
                  Already in the Arena. Go pick them in a battle instead.
                </span>
              </p>
            ) : (
              <div className="mt-[18px] border-t border-hairline pt-[18px]">
                <label className="block">
                  <span className="mb-[7px] block font-display text-xs font-bold tracking-[0.1em] text-ink-soft uppercase">
                    Why are they underhyped? <em className="ml-2 text-[10.5px] tracking-[0.12em] text-ink-faint not-italic">Optional</em>
                  </span>
                  <span className="flex items-start gap-3 rounded-[14px] border border-hairline-2 bg-card px-4 py-3 transition-[border-color,box-shadow] duration-150 focus-within:border-foreground focus-within:shadow-[0_0_0_3px_rgb(216_255_62/0.55)]">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      maxLength={140}
                      placeholder="They’re building an amazing…"
                      aria-label="Why are they underhyped"
                      className="min-w-0 flex-1 resize-none border-0 bg-transparent text-[15.5px] leading-[1.45] text-foreground outline-none placeholder:text-ink-faint"
                    />
                  </span>
                </label>
                <span className="mt-1.5 block text-right text-xs text-ink-faint tabular-nums">
                  {140 - note.length} left
                </span>
              </div>
            )}
          </PreviewCard>

          {submitError ? (
            <p className="mt-4 rounded-[14px] border border-down bg-card px-4 py-3 text-sm text-down">
              {submitError}
            </p>
          ) : null}

          {found.existingUsername ? (
            <Link
              href={`/c/${found.existingUsername}`}
              className="mt-2 block w-full rounded-[14px] bg-primary px-5 py-[18px] text-center font-display text-[17px] font-extrabold tracking-[-0.02em] text-primary-foreground no-underline transition-transform duration-150 hover:-translate-y-0.5"
            >
              See their profile →
            </Link>
          ) : (
            <BigButton onClick={handleSend} disabled={isPending}>
              Nominate 🔥
            </BigButton>
          )}
          <GhostButton onClick={restart}>Not them — try another link</GhostButton>
        </section>
      ) : null}

      {step === "done" ? (
        <section>
          <div className="pt-10 pb-[30px] text-center">
            <h1 className="font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              Nice <MarkerSwipe>find.</MarkerSwipe>
            </h1>
          </div>
          <div className="rounded-card bg-lime px-7 py-[34px] text-center">
            <h2 className="mb-2 font-display text-[26px] font-extrabold tracking-[-0.035em]">
              @{found?.handle} has been nominated 🔥
            </h2>
            <p className="text-[15px] text-foreground/70">
              We&rsquo;ll reach out to them on X. If they&rsquo;re in, they&rsquo;ll enter the
              Arena the normal way.
            </p>
          </div>
          <GhostButton onClick={restart}>Nominate someone else</GhostButton>
        </section>
      ) : null}
    </div>
  );
}
