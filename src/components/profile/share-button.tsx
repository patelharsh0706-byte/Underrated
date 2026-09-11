"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ShareButtonProps {
  url: string;
  /** The welcome screen asks for the link by name; the profile page doesn't. */
  label?: string;
}

/**
 * The Clipboard API can reject with NotAllowedError for reasons that have
 * nothing to do with actual user intent — no permission granted yet in this
 * context, an insecure/embedded context, focus quirks — so it's not safe to
 * let it throw uncaught. Falls back to the old execCommand approach, which
 * works synchronously without the async permission prompt.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy method below.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
}

export function ShareButton({ url, label = "Share profile" }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

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

    const succeeded = await copyToClipboard(url);
    setStatus(succeeded ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={cn(
        "rounded-[10px] bg-primary px-[18px] py-2.5 font-display text-sm font-bold whitespace-nowrap text-primary-foreground",
        "transition-transform hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      {status === "copied" ? "Copied ✓" : status === "failed" ? "Couldn’t copy" : label}
    </button>
  );
}
