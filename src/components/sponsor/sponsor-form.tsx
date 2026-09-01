"use client";

import { useState, useTransition } from "react";

import { createSponsorshipCheckout, type SponsorCheckoutResult } from "@/app/actions/sponsor";
import { cn } from "@/lib/utils";

interface SponsorFormProps {
  nextStart: string;
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border-2 bg-card px-3 py-2 text-sm outline-none",
    hasError ? "border-loser" : "border-foreground",
  );
}

export function SponsorForm({ nextStart }: SponsorFormProps) {
  const [isPending, startTransition] = useTransition();

  const [sponsorName, setSponsorName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [result, setResult] = useState<SponsorCheckoutResult | null>(null);

  const startDate = new Date(nextStart).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await createSponsorshipCheckout({ sponsorName, imageUrl, targetUrl });
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
        <label htmlFor="sponsorName" className="text-sm font-bold">
          Name
        </label>
        <input
          id="sponsorName"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          className={inputClass(!!errors.sponsorName)}
          placeholder="Your brand or product"
        />
        {errors.sponsorName ? <p className="text-xs text-loser">{errors.sponsorName}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="imageUrl" className="text-sm font-bold">
          Logo image URL
        </label>
        <input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={inputClass(!!errors.imageUrl)}
          placeholder="https://yoursite.com/logo.png"
        />
        {errors.imageUrl ? <p className="text-xs text-loser">{errors.imageUrl}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetUrl" className="text-sm font-bold">
          Link
        </label>
        <input
          id="targetUrl"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className={inputClass(!!errors.targetUrl)}
          placeholder="https://yoursite.com"
        />
        {errors.targetUrl ? <p className="text-xs text-loser">{errors.targetUrl}</p> : null}
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
