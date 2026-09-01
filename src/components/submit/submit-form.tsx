"use client";

import { useState, useTransition } from "react";

import { createSubmissionCheckout, type SubmitCreatorResult } from "@/app/actions/creator";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "illustration",
  "dev",
  "music",
  "writing",
  "design",
  "photography",
  "comedy",
  "film",
] as const;

const SOCIAL_PLATFORMS = [
  { key: "twitter", label: "𝕏 / Twitter" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
] as const;

const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100, 500];

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-card px-3 py-2 text-sm outline-none",
    hasError ? "border-loser" : "border-foreground",
  );
}

export function SubmitForm() {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState<string>("");
  const [workUrl, setWorkUrl] = useState("");
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({});
  const [primarySocial, setPrimarySocial] = useState("");
  const [pendingPlatform, setPendingPlatform] = useState<string>(SOCIAL_PLATFORMS[0].key);
  const [pendingUrl, setPendingUrl] = useState("");
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");

  const [result, setResult] = useState<SubmitCreatorResult | null>(null);

  const filledSocials = Object.fromEntries(
    Object.entries(socialUrls).filter(([, url]) => url.trim().length > 0),
  );

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  const addSocial = () => {
    const url = pendingUrl.trim();
    if (!url) return;
    setSocialUrls((prev) => ({ ...prev, [pendingPlatform]: url }));
    setPrimarySocial((prev) => prev || pendingPlatform);
    setPendingUrl("");
  };

  const removeSocial = (key: string) => {
    setSocialUrls((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPrimarySocial((prev) => (prev === key ? "" : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await createSubmissionCheckout({
        name,
        username,
        bio: bio || undefined,
        category,
        workUrl,
        socials: filledSocials as Record<
          (typeof SOCIAL_PLATFORMS)[number]["key"],
          string
        >,
        primarySocial,
        amountCents: Math.round(effectiveAmount * 100),
      });

      // A successful submit redirects to Dodo Payments and never returns here.
      setResult(res);
    });
  };

  const errors = result?.fieldErrors ?? {};

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {result?.error ? (
        <p className="rounded-xl border-2 border-loser bg-card px-4 py-3 text-sm text-loser">
          {result.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-bold">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass(!!errors.name)}
          placeholder="Aidan Cho"
        />
        {errors.name ? <p className="text-xs text-loser">{errors.name}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-bold">
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass(!!errors.username)}
          placeholder="verse_null"
        />
        {errors.username ? <p className="text-xs text-loser">{errors.username}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-bold">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass(!!errors.category)}
        >
          <option value="" disabled>
            Choose one
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category ? <p className="text-xs text-loser">{errors.category}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-bold">
          One-line bio
        </label>
        <input
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 140))}
          className={inputClass(false)}
          placeholder="Stand-up about being extremely online and extremely tired."
        />
        <p className="text-right text-xs text-muted-foreground">{bio.length}/140</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="workUrl" className="text-sm font-bold">
          View work — your strongest evidence
        </label>
        <input
          id="workUrl"
          value={workUrl}
          onChange={(e) => setWorkUrl(e.target.value)}
          className={inputClass(!!errors.workUrl)}
          placeholder="https://github.com/you/your-best-project"
        />
        {errors.workUrl ? <p className="text-xs text-loser">{errors.workUrl}</p> : null}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold">Social links</legend>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={pendingUrl}
            onChange={(e) => setPendingUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSocial();
              }
            }}
            placeholder="Paste your profile link…"
            className={inputClass(false)}
          />
          <div className="flex gap-2">
            <select
              value={pendingPlatform}
              onChange={(e) => setPendingPlatform(e.target.value)}
              className="w-0 flex-1 rounded-xl border-2 border-foreground bg-card px-2 py-2 text-sm sm:w-36 sm:flex-none sm:shrink-0"
            >
              {SOCIAL_PLATFORMS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addSocial}
              className="shrink-0 rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Add
            </button>
          </div>
        </div>

        {Object.keys(filledSocials).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(filledSocials).map(([key, url]) => (
              <span
                key={key}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-medium",
                  primarySocial === key
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-foreground/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => setPrimarySocial(key)}
                  title={url}
                  className="cursor-pointer"
                >
                  {SOCIAL_PLATFORMS.find((p) => p.key === key)?.label ?? key}
                </button>
                <button
                  type="button"
                  onClick={() => removeSocial(key)}
                  aria-label={`Remove ${key}`}
                  className="cursor-pointer opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {errors.socials ? <p className="text-xs text-loser">{errors.socials}</p> : null}
        {errors.primarySocial ? (
          <p className="text-xs text-loser">{errors.primarySocial}</p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card p-4">
        <span className="text-sm font-bold">Entry fee</span>

        <div className="mt-1 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
              className={cn(
                "rounded-full border-2 px-3 py-1 text-sm font-medium",
                !customAmount && amount === preset
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-foreground/30 hover:border-foreground",
              )}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Custom:</span>
          <span className="text-sm font-bold">$</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={String(amount)}
            className={cn(inputClass(!!errors.amountCents), "max-w-[100px]")}
          />
        </div>
        {errors.amountCents ? (
          <p className="text-xs text-loser">{errors.amountCents}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform",
          !isPending && "hover:-translate-y-0.5 active:translate-y-0",
          isPending && "cursor-default opacity-60",
        )}
      >
        {isPending ? "Redirecting to checkout…" : `Pay $${effectiveAmount || 0} & submit`}
      </button>
    </form>
  );
}
