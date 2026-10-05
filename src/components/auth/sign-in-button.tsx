"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignInButton() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    const next = searchParams.get("next") ?? "/arena";
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "x",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
    // On success the browser navigates away to X — nothing else to do here.
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
        <span aria-hidden="true" className="text-lg leading-none">𝕏</span>
        {loading ? "Opening X…" : "Continue with X"}
      </button>
      {error ? <p className="text-sm text-loser">{error}</p> : null}
    </div>
  );
}
