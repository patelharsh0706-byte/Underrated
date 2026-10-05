import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EntryGate } from "@/components/auth/entry-gate";
import { ArenaEntry } from "@/components/submit/arena-entry";
import { getEntryState } from "@/lib/account";
import { onboardingFor } from "@/lib/entry-gate";

export const metadata: Metadata = {
  title: "Enter the Arena — Underhyped",
  description: "Sign in with X, finish your free profile, then step into the Arena.",
};

// The header's and Home's "Enter the Arena" — DECISIONS.md § 2026-10-06.
// Checked here on the server, so typing /submit can't skip a step.
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const state = await getEntryState();
  if (state.kind === "needs-profile") redirect(onboardingFor("/submit"));
  if (state.kind === "in-arena") redirect(`/c/${state.username}`);

  return (
    <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8 sm:py-10">
      {state.kind === "signed-out" ? <EntryGate variant="arena" next="/submit" back="/" /> : <ArenaEntry />}
    </main>
  );
}
