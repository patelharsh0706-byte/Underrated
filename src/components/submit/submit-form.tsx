"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createSubmissionCheckout, type SubmitCreatorResult } from "@/app/actions/creator";
import type { ALLOWED_SOCIALS } from "@/lib/creator-schema";
import {
  normalizeToUrlString,
  resolveSponsorProfile,
  type ResolvedSponsorProfile,
} from "@/lib/unavatar";
import { cn } from "@/lib/utils";

const RESOLVE_DEBOUNCE_MS = 400;

const CATEGORIES = ["Indie Developer", "Builder", "CEO/Founder"] as const;

type AllowedSocial = (typeof ALLOWED_SOCIALS)[number];

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-card px-3 py-2 text-sm outline-none transition-colors",
    "focus:border-aura focus:ring-2 focus:ring-aura/30",
    hasError ? "border-loser" : "border-foreground",
  );
}

export function SubmitForm() {
  const [isPending, startTransition] = useTransition();

  const [profileUrl, setProfileUrl] = useState("");
  const [resolved, setResolved] = useState<ResolvedSponsorProfile | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState<string>("");
  const [workUrl, setWorkUrl] = useState("");
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({});
  const [primarySocial, setPrimarySocial] = useState("");

  const [result, setResult] = useState<SubmitCreatorResult | null>(null);

  const usernameTouched = useRef(false);
  const lastResolvedKey = useRef<string | null>(null);

  const filledSocials = Object.fromEntries(
    Object.entries(socialUrls).filter(([, url]) => url.trim().length > 0),
  );

  // Debounced resolution — stops the confirmation card flickering while
  // someone is still typing. On each *new* resolution it also fills the
  // username (only if untouched) and seeds the socials section. Name and bio
  // are deliberately left alone: a real name isn't derivable from a handle,
  // and "@handle on X" is a weak bio when the bio does real work on the
  // battle card.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = resolveSponsorProfile(profileUrl);
      setResolved(next);
      setAvatarFailed(false);

      if (!next || lastResolvedKey.current === next.sourceLabel) return;
      lastResolvedKey.current = next.sourceLabel;

      if (!usernameTouched.current && next.suggestedUsername) {
        setUsername(next.suggestedUsername);
      }

      const absolute = normalizeToUrlString(profileUrl);
      const socialKey = next.socialKey;
      if (socialKey && absolute) {
        setSocialUrls((prev) => ({ ...prev, [socialKey]: absolute }));
        setPrimarySocial((prev) => prev || socialKey);
      }
    }, RESOLVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [profileUrl]);

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
        socials: filledSocials as Record<AllowedSocial, string>,
        primarySocial,
      });

      // A successful submit redirects to Dodo Payments and never returns here.
      setResult(res);
    });
  };

  const errors = result?.fieldErrors ?? {};
  const monogram = (username || name).trim().replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {result?.error ? (
        <p className="rounded-xl border-2 border-loser bg-card px-4 py-3 text-sm text-loser">
          {result.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profileUrl" className="text-sm font-bold">
          Your link
        </label>
        <input
          id="profileUrl"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          className={inputClass(false)}
          placeholder="https://x.com/yourhandle or @yourhandle"
        />

        {resolved ? (
          <div className="mt-1 flex items-center gap-3 rounded-xl border-2 border-winner bg-card px-3 py-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-foreground bg-muted text-xs font-bold text-muted-foreground">
              {avatarFailed ? (
                monogram
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={resolved.imageUrl}
                  src={resolved.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
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
          onChange={(e) => {
            usernameTouched.current = true;
            setUsername(e.target.value);
          }}
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
          placeholder="Building a text editor that only I will ever use."
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
          placeholder="Website, GitHub, or anything else worth showing"
        />
        {errors.workUrl ? <p className="text-xs text-loser">{errors.workUrl}</p> : null}
      </div>

      {errors.socials || errors.primarySocial ? (
        <p className="text-xs text-loser">
          {errors.socials ?? errors.primarySocial}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform",
          !isPending && "hover:-translate-y-0.5 active:translate-y-0",
          isPending && "cursor-default opacity-60",
        )}
      >
        {isPending ? "Redirecting to checkout…" : "Pay $3 & submit"}
      </button>
    </form>
  );
}
