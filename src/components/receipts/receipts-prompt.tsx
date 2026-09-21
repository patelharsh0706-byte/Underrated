"use client";

import { useEffect, useRef, useState } from "react";

import { startGoogleSignIn } from "@/lib/supabase/oauth";

type ReceiptsPromptVariant = "nudge" | "spot";

interface ReceiptsPromptProps {
  variant: ReceiptsPromptVariant;
  firstName?: string;
  isOpen: boolean;
  onDismiss: () => void;
}

const TITLE_ID = "receipts-prompt-title";

/**
 * The Receipts prompt — DESIGN.md § Receipts prompt. One component, two
 * variants: the nudge after five picks, and "Spot {name}?" when a signed-out
 * voter taps the Spot button.
 *
 * A native <dialog> opened with showModal(), which is what makes it a dialog
 * rather than a styled div: the browser puts it in the top layer and centres
 * it, traps focus inside, closes it on Escape, and paints ::backdrop behind
 * it. The previous version rendered <dialog open> inside a flex-centred
 * overlay — the UA stylesheet makes <dialog> position:absolute, which takes it
 * out of flex layout, so it sat pinned to the left with no Escape and no focus
 * containment.
 *
 * Every way out — Escape, a click on the backdrop, "Not now" — goes through the
 * dialog's own close event, so onDismiss fires exactly once per dismissal.
 */
export function ReceiptsPrompt({ variant, firstName, isOpen, onDismiss }: ReceiptsPromptProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    // showModal() throws on an already-open dialog — Fast Refresh can re-run
    // this effect against the same element.
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsPending(true);
    try {
      await startGoogleSignIn(window.location.pathname);
    } catch (error) {
      console.error("Sign in error:", error);
      setIsPending(false);
    }
  };

  const isNudge = variant === "nudge";
  const title = isNudge ? "5 BATTLES IN." : `Spot ${firstName}?`;
  const description = isNudge
    ? "Want us to keep your receipts? We'll remember who you backed before everyone else catches up."
    : "Sign in and we'll keep the receipt.";
  const buttonLabel = isNudge ? "KEEP MY RECEIPTS →" : "SIGN IN WITH GOOGLE →";

  return (
    // p-0 with an inner wrapper: a click that reaches the <dialog> element
    // itself is a click on the backdrop, not on the card's padding.
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onDismiss}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card bg-card p-0 text-foreground shadow-lift backdrop:bg-black/50"
    >
      <div className="p-6">
        <h2 id={TITLE_ID} className="font-display text-lg font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{description}</p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isPending}
            className="w-full rounded-[14px] bg-lime py-3 font-display text-sm font-bold tracking-wide text-foreground transition-colors hover:bg-lime-deep disabled:opacity-50"
          >
            {isPending ? "Signing in..." : buttonLabel}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isPending}
            className="w-full py-2 text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}
