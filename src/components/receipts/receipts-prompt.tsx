"use client";

import { useState } from "react";
import { startGoogleSignIn } from "@/lib/supabase/oauth";

type ReceiptsPromptVariant = "nudge" | "spot";

interface ReceiptsPromptProps {
  variant: ReceiptsPromptVariant;
  firstName?: string;
  isOpen: boolean;
  onDismiss: () => void;
}

export function ReceiptsPrompt({
  variant,
  firstName,
  isOpen,
  onDismiss,
}: ReceiptsPromptProps) {
  const [isPending, setIsPending] = useState(false);

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

  const handleDismiss = () => {
    onDismiss();
  };

  const isNudge = variant === "nudge";
  const title = isNudge
    ? "5 BATTLES IN."
    : `Spot ${firstName}?`;
  const description = isNudge
    ? "Want us to keep your receipts? We'll remember who you backed before everyone else catches up."
    : "Sign in and we'll keep the receipt.";
  const buttonLabel = isNudge
    ? "KEEP MY RECEIPTS →"
    : "SIGN IN WITH GOOGLE →";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onDismiss}
      role="presentation"
    >
      <dialog
        open
        className="bg-white rounded-2xl p-6 max-w-sm shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{description}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSignIn}
            disabled={isPending}
            className="w-full bg-lime-400 text-gray-900 font-semibold py-2 rounded-lg hover:bg-lime-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Signing in..." : buttonLabel}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="w-full text-gray-600 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Not now
          </button>
        </div>
      </dialog>
    </div>
  );
}
