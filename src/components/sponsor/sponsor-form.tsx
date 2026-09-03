"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createSponsorshipCheckout, type SponsorCheckoutResult } from "@/app/actions/sponsor";
import {
  normalizeToUrlString,
  resolveSponsorProfile,
  type ResolvedSponsorProfile,
} from "@/lib/unavatar";
import { cn } from "@/lib/utils";

const RESOLVE_DEBOUNCE_MS = 400;

interface SponsorFormProps {
  nextStart: string;
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-card px-3 py-2 text-sm outline-none transition-colors",
    "focus:border-aura focus:ring-2 focus:ring-aura/30",
    hasError ? "border-loser" : "border-foreground",
  );
}

export function SponsorForm({ nextStart }: SponsorFormProps) {
  const [isPending, startTransition] = useTransition();

  const [sponsorName, setSponsorName] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [resolved, setResolved] = useState<ResolvedSponsorProfile | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [result, setResult] = useState<SponsorCheckoutResult | null>(null);

  const nameTouched = useRef(false);
  const descriptionTouched = useRef(false);
  const lastAutoFilledKey = useRef<string | null>(null);

  // Debounced resolution — avoids the confirmation card flickering on every
  // keystroke while someone's still typing the link.
  useEffect(() => {
    const timer = setTimeout(() => {
      setResolved(resolveSponsorProfile(targetUrl));
      setLogoFailed(false);
    }, RESOLVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [targetUrl]);

  // Auto-fill Name/Description once per *new* resolution, and only for
  // fields the sponsor hasn't already hand-edited. A plain website resolves
  // to empty suggestions, so this is a no-op in that case.
  useEffect(() => {
    if (!resolved) return;
    if (lastAutoFilledKey.current === resolved.sourceLabel) return;
    lastAutoFilledKey.current = resolved.sourceLabel;

    if (!nameTouched.current && resolved.suggestedName) {
      setSponsorName(resolved.suggestedName);
    }
    if (!descriptionTouched.current && resolved.suggestedDescription) {
      setDescription(resolved.suggestedDescription);
    }
    setLogoRemoved(false);
  }, [resolved]);

  const startDate = new Date(nextStart).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      // Submit the normalized absolute URL, not necessarily what was typed —
      // "@loyal" resolves fine for preview but isn't itself a valid URL.
      const normalizedUrl = normalizeToUrlString(targetUrl);
      if (!normalizedUrl) {
        setResult({ error: "Enter a valid link.", fieldErrors: { targetUrl: "Enter a valid link" } });
        return;
      }

      // A logo that failed to load isn't a logo we should pretend succeeded.
      const res = await createSponsorshipCheckout({
        sponsorName,
        description,
        targetUrl: normalizedUrl,
        logoRemoved: logoRemoved || logoFailed,
      });
      setResult(res);
    });
  };

  const errors = result?.fieldErrors ?? {};
  const showLogo = resolved && !logoRemoved;
  const monogram = sponsorName.trim().replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {result?.error ? (
        <p className="rounded-xl border-2 border-loser bg-card px-4 py-3 text-sm text-loser">
          {result.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetUrl" className="text-sm font-bold">
          Link
        </label>
        <input
          id="targetUrl"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className={inputClass(!!errors.targetUrl)}
          placeholder="https://yoursite.com or https://x.com/yourhandle"
        />
        {errors.targetUrl ? <p className="text-xs text-loser">{errors.targetUrl}</p> : null}

        {resolved ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-winner bg-card px-3 py-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-foreground bg-muted text-xs font-bold text-muted-foreground">
              {logoFailed ? (
                monogram
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={resolved.imageUrl}
                  src={resolved.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <span className="flex-1 truncate text-sm text-muted-foreground">
              {resolved.sourceLabel}
            </span>
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-winner">
              Selected
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sponsorName" className="text-sm font-bold">
          Name
        </label>
        <input
          id="sponsorName"
          value={sponsorName}
          onChange={(e) => {
            nameTouched.current = true;
            setSponsorName(e.target.value);
          }}
          className={inputClass(!!errors.sponsorName)}
          placeholder="Your brand or product"
        />
        {errors.sponsorName ? <p className="text-xs text-loser">{errors.sponsorName}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-bold">
          Short description <span className="font-normal text-muted-foreground">optional</span>
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => {
            descriptionTouched.current = true;
            setDescription(e.target.value.slice(0, 140));
          }}
          className={inputClass(false)}
          placeholder="What you're building"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold">
            Logo <span className="font-normal text-muted-foreground">optional</span>
          </span>
          {resolved ? (
            <button
              type="button"
              onClick={() => setLogoRemoved((prev) => !prev)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {showLogo ? "Remove" : "Add"}
            </button>
          ) : null}
        </div>

        {showLogo ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-foreground/30 px-3 py-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-foreground bg-muted text-xs font-bold text-muted-foreground">
              {logoFailed || !resolved ? (
                monogram
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolved.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <span className="text-sm font-bold">
              {logoFailed ? "No logo found — using your initial" : "Logo ready"}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-foreground/30 px-3 py-3 text-center text-xs text-muted-foreground">
            {resolved ? "No logo — banner will show your initial" : "Paste a link above first"}
          </div>
        )}
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
        {isPending ? "Checking…" : `Pay $30 — starts ${startDate}`}
      </button>
    </form>
  );
}
