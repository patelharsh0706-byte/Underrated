"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import { createSubmissionCheckout, type SubmitCreatorResult } from "@/app/actions/creator";
import { DomainLogo } from "@/components/domain-logo";
import { MarkerSwipe } from "@/components/marker-swipe";
import type { ALLOWED_SOCIALS } from "@/lib/creator-schema";
import { SUBMISSION_FEE_CENTS } from "@/lib/creator-schema";
import { getCreatorAvatarUrl, getUnavatarUrl, toUsernameSlug } from "@/lib/unavatar";
import { cn } from "@/lib/utils";

// Derived, not hardcoded — the fee lives in one place and a literal here
// would be free to drift from the real charge.
const FEE = `$${(SUBMISSION_FEE_CENTS / 100).toFixed(SUBMISSION_FEE_CENTS % 100 === 0 ? 0 : 2)}`;

// Source of truth for real creator categories — the leaderboard's category
// filter imports this directly rather than re-declaring it, so the two can
// never drift apart. See leaderboard-board.tsx.
export const CATEGORIES = ["Indie Developer", "Builder", "CEO/Founder"] as const;

type AllowedSocial = (typeof ALLOWED_SOCIALS)[number];

// Same palette the battle card's work-link monogram uses, picked the same
// way — by host length, so a creator's mark is stable without being stored.
const MARKS = ["#B4603A", "#2F6BE0", "#6B5BD6", "#1D8E45", "#C4399E", "#0F7B7B"];

type Step = "form" | "loading" | "preview" | "edit" | "done";

interface Draft {
  handle: string;
  user: string;
  name: string;
  bio: string;
  work: string;
  host: string;
  project: string;
  social: string;
  avatar: string;
  mark: string;
  /** The project's real favicon/logo, via unavatar's domain lookup. */
  logo: string | null;
  cat: string;
}

/** A handle out of anything that looks like an X URL or a bare @name. */
function parseHandle(raw: string): string | null {
  const v = raw.trim().replace(/^@/, "");
  if (!v) return null;
  const m = v.match(/(?:^|\/\/)(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9_]{1,15}$/.test(v)) return v;
  return null;
}

function parseSite(raw: string): { url: string; host: string } | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".")) return null;
    return { url: u.href, host: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

/** Project name from a domain: dissectmac.com -> Dissectmac. */
function projectName(host: string): string {
  const base = host.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  error,
  ariaLabel,
  inputMode,
  maxLength,
}: {
  label: string;
  icon?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  ariaLabel: string;
  inputMode?: "url" | "text";
  maxLength?: number;
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
            maxLength={maxLength}
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

function PreviewCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card bg-card p-6 shadow-card", className)}>{children}</div>
  );
}

export function EnterArenaFlow() {
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("form");
  const [xInput, setXInput] = useState("");
  const [workInput, setWorkInput] = useState("");
  const [errX, setErrX] = useState<string | undefined>();
  const [errW, setErrW] = useState<string | undefined>();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadText, setLoadText] = useState("Reading your X profile…");
  const [result, setResult] = useState<SubmitCreatorResult | null>(null);

  // Edit-step buffers, so cancelling out of the step can't half-apply.
  const [edName, setEdName] = useState("");
  const [edUser, setEdUser] = useState("");
  const [edBio, setEdBio] = useState("");
  const [edWork, setEdWork] = useState("");

  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const handleFetch = useCallback(() => {
    const handle = parseHandle(xInput);
    const site = parseSite(workInput);

    setErrX(handle ? undefined : "That doesn’t look like an X profile link.");
    setErrW(site ? undefined : "Add a link to something you’ve made.");
    if (!handle || !site) return;

    const social = `https://x.com/${handle}`;
    const user = toUsernameSlug(handle);
    const next: Draft = {
      handle,
      user,
      // X does not publish a name or bio to fetch, so the handle stands in
      // and the bio falls back to the project line below. Edit details is
      // where both get corrected — that is what the step is for.
      name: handle,
      bio: "",
      work: site.url,
      host: site.host,
      project: projectName(site.host),
      social,
      // Real avatar with a generated Dicebear fallback already baked into
      // the URL, same as every other avatar in the app.
      avatar: getCreatorAvatarUrl(social, user),
      mark: MARKS[site.host.length % MARKS.length],
      logo: getUnavatarUrl(site.url),
      cat: "",
    };

    setDraft(next);
    setStep("loading");
    setLoadText("Reading your X profile…");

    // Both lines describe work that actually happens here: the X avatar and
    // the project's logo are really fetched, so the preview card never
    // renders an empty circle or pops a logo in late. A failed lookup
    // resolves too — DomainLogo falls back to the colour mark. The floor
    // keeps both lines readable when the images come back from cache.
    const preload = (src: string | null) => {
      if (!src) return Promise.resolve(undefined);
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    };

    timers.current.push(window.setTimeout(() => setLoadText(`Fetching ${site.host}…`), 700));
    const floor = new Promise((r) => timers.current.push(window.setTimeout(r, 1500)));

    void Promise.all([preload(next.avatar), preload(next.logo), floor]).then(() =>
      setStep("preview"),
    );
  }, [xInput, workInput]);

  const openEdit = () => {
    if (!draft) return;
    setEdName(draft.name);
    setEdUser(draft.user);
    setEdBio(draft.bio);
    setEdWork(draft.work);
    setStep("edit");
  };

  const saveEdit = () => {
    if (!draft) return;
    const site = parseSite(edWork);
    setDraft({
      ...draft,
      name: edName.trim() || draft.name,
      user: toUsernameSlug(edUser) || draft.user,
      bio: edBio.trim(),
      ...(site
        ? { work: site.url, host: site.host, project: projectName(site.host) }
        : {}),
      ...(site
        ? { mark: MARKS[site.host.length % MARKS.length], logo: getUnavatarUrl(site.url) }
        : {}),
    });
    setStep("preview");
  };

  const restart = () => {
    clearTimers();
    setDraft(null);
    setResult(null);
    setXInput("");
    setWorkInput("");
    setErrX(undefined);
    setErrW(undefined);
    setStep("form");
  };

  const enter = () => {
    if (!draft) return;
    setResult(null);
    setStep("done");

    startTransition(async () => {
      const res = await createSubmissionCheckout({
        name: draft.name,
        username: draft.user,
        bio: draft.bio || undefined,
        category: draft.cat,
        workUrl: draft.work,
        socials: { twitter: draft.social } as Record<AllowedSocial, string>,
        primarySocial: "twitter",
      });

      // A successful submit redirects to checkout and never returns here.
      setResult(res);
      setStep("preview");
    });
  };

  const fieldErrors = result?.fieldErrors ?? {};
  const problem =
    result?.error ??
    fieldErrors.name ??
    fieldErrors.username ??
    fieldErrors.bio ??
    fieldErrors.category ??
    fieldErrors.workUrl ??
    fieldErrors.socials ??
    fieldErrors.primarySocial;

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {step === "form" ? (
        <section>
          <div className="px-0 pt-10 pb-[30px] text-center">
            <p className="font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
              🔥 Enter the arena
            </p>
            <h1 className="mx-auto mt-3 max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              Put yourself on the <MarkerSwipe>radar.</MarkerSwipe>
            </h1>
            <p className="mt-3.5 text-base text-ink-soft sm:text-lg">
              Two links. That’s the whole form.
            </p>
          </div>

          <Field
            label="Your X profile"
            icon="𝕏"
            value={xInput}
            onChange={setXInput}
            placeholder="x.com/username"
            ariaLabel="Your X profile URL"
            inputMode="url"
            error={errX}
          />

          <Field
            label="What are you building?"
            icon="↗"
            value={workInput}
            onChange={setWorkInput}
            placeholder="yourproject.com"
            ariaLabel="Your project URL"
            inputMode="url"
            error={errW}
          />

          <BigButton onClick={handleFetch}>Enter the Arena →</BigButton>
          <Helper>Takes ~10 sec · {FEE} one-time</Helper>

          <span className="relative mt-10 block rotate-[-2deg] text-center font-hand text-[19px] font-bold tracking-[0.04em] text-ink-faint uppercase">
            good people deserve more hype.
            <svg
              width="190"
              height="9"
              viewBox="0 0 190 9"
              fill="none"
              aria-hidden="true"
              className="mx-auto mt-0.5 block max-w-full text-lime-deep"
            >
              <path
                d="M3 6c44-5 120-6 184-2"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </section>
      ) : null}

      {step === "loading" ? (
        <section>
          <div className="pt-10 pb-[30px] text-center">
            <h1 className="mx-auto max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              Building your <MarkerSwipe>card.</MarkerSwipe>
            </h1>
          </div>
          <PreviewCard>
            <p className="flex items-center justify-center gap-2.5 py-[46px] text-[14.5px] text-ink-soft">
              <span className="pulse-dot h-[9px] w-[9px] rounded-full bg-aura" aria-hidden="true" />
              <span>{loadText}</span>
            </p>
          </PreviewCard>
        </section>
      ) : null}

      {step === "preview" && draft ? (
        <section>
          <StepHead>Looking good? 🔥</StepHead>

          {problem ? (
            <p className="mb-4 rounded-[14px] border border-down bg-card px-4 py-3 text-sm text-down">
              {problem}
            </p>
          ) : null}

          <PreviewCard>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.avatar}
                alt=""
                className="h-[68px] w-[68px] flex-none rounded-full bg-muted object-cover"
              />
              <div className="min-w-0">
                <h3 className="font-display text-[21px] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">
                  {draft.name}
                </h3>
                <p className="mt-px text-[14.5px] text-ink-soft [overflow-wrap:anywhere]">
                  @{draft.user}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[15.5px] leading-[1.45]">
              {draft.bio ? (
                draft.bio
              ) : (
                <>
                  Building <strong>{draft.project}</strong>.{" "}
                  <span className="text-ink-faint">
                    Add a line about yourself under Edit details.
                  </span>
                </>
              )}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={draft.work}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-background px-3.5 py-[7px] text-[13.5px] font-semibold text-ellipsis whitespace-nowrap text-ink-soft"
              >
                <DomainLogo
                  imageUrl={draft.logo}
                  host={draft.host}
                  markColor={draft.mark}
                  className="h-4 w-4 rounded-[5px] text-[9px]"
                />
                <span className="truncate">{draft.host}</span>
              </a>
              <a
                href={draft.social}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-[7px] text-[13.5px] font-semibold text-ink-soft"
              >
                𝕏
              </a>
            </div>

            {/* Category is the one thing two URLs cannot tell us — the schema
                requires it, so it is one tap here rather than a second screen. */}
            <div className="mt-5 border-t border-hairline pt-[18px]">
              <span className="mb-2.5 block font-display text-[11.5px] font-bold tracking-[0.1em] text-ink-soft uppercase">
                One last thing — what are you?
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, cat: c })}
                    aria-pressed={draft.cat === c}
                    className={cn(
                      "cursor-pointer rounded-full border px-[17px] py-[9px] text-[13.5px] whitespace-nowrap transition-[color,background-color,border-color] duration-150",
                      draft.cat === c
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-hairline bg-card font-medium text-ink-soft hover:border-hairline-2 hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </PreviewCard>

          <BigButton onClick={enter} disabled={!draft.cat || isPending}>
            Enter the Arena →
          </BigButton>
          <Helper>{FEE} one-time · you’ll be taken to checkout</Helper>
          <GhostButton onClick={openEdit}>Edit details</GhostButton>
        </section>
      ) : null}

      {step === "edit" && draft ? (
        <section>
          <StepHead>Fix what we got wrong</StepHead>

          <PreviewCard className="flex flex-col">
            <Field label="Name" value={edName} onChange={setEdName} ariaLabel="Name" />
            <Field label="Username" value={edUser} onChange={setEdUser} ariaLabel="Username" />
            <Field
              label="Bio — 140 characters"
              value={edBio}
              onChange={setEdBio}
              ariaLabel="Bio"
              maxLength={140}
            />
            <Field
              label="What you’re building"
              value={edWork}
              onChange={setEdWork}
              ariaLabel="Work URL"
              inputMode="url"
            />
          </PreviewCard>

          <BigButton onClick={saveEdit}>Back to preview →</BigButton>
        </section>
      ) : null}

      {step === "done" ? (
        <section>
          <div className="pt-10 pb-[30px] text-center">
            <h1 className="font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
              You’re <MarkerSwipe>in.</MarkerSwipe>
            </h1>
          </div>
          <div className="rounded-card bg-lime px-7 py-[34px] text-center">
            <h2 className="mb-2 font-display text-[26px] font-extrabold tracking-[-0.035em]">
              Taking you to checkout 🔥
            </h2>
            <p className="text-[15px] text-foreground/70">
              {FEE} one-time. Your first battle starts the moment it clears.
            </p>
          </div>
          <GhostButton onClick={restart}>Start over</GhostButton>
        </section>
      ) : null}
    </div>
  );
}
