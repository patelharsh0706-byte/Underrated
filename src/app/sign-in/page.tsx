import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInButton } from "@/components/auth/sign-in-button";

export const metadata: Metadata = {
  title: "Sign in — Underrated",
};

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border-2 border-foreground bg-card p-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Underrated</h1>
          <p className="text-sm text-muted-foreground">
            You only need this to submit yourself or manage your profile. Voting
            never requires an account.
          </p>
        </div>

        <Suspense fallback={null}>
          <SignInButton />
        </Suspense>
      </div>
    </main>
  );
}
