"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ShareButtonProps {
  url: string;
}

export function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled the native share sheet, or it's unsupported here —
        // fall through to clipboard.
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={cn(
        "rounded-full border-2 border-foreground bg-primary px-6 py-2 text-sm font-bold text-primary-foreground",
        "transition-transform hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      {copied ? "Copied!" : "Share profile"}
    </button>
  );
}
