import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInButton } from "@/components/auth/sign-in-button";

export const metadata: Metadata = {
  title: "Sign in — Underhyped",
};

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border-2 border-foreground bg-card p-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Underhyped</h1>
          <p className="text-sm text-muted-foreground">
            One account, made with X. It keeps battles fair: one Hype per
            battle. We never post for you.
          </p>
        </div>

        <Suspense fallback={null}>
          <SignInButton />
        </Suspense>
      </div>
    </main>
  );
}
