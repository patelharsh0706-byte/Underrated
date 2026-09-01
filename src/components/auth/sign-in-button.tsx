"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignInButton() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    const next = searchParams.get("next") ?? "/submit";
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
    // On success the browser navigates away to Google — nothing else to do here.
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-xl border-2 border-foreground bg-background px-6 py-3 text-sm font-bold transition-transform",
          !loading && "hover:-translate-y-0.5 active:translate-y-0",
          loading && "cursor-default opacity-60",
        )}
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-loser">{error}</p> : null}
    </div>
  );
}
