import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EntryGate } from "@/components/auth/entry-gate";
import { EnterArenaFlow } from "@/components/submit/enter-arena-flow";
import { getEntryState } from "@/lib/account";
import { onboardingFor } from "@/lib/entry-gate";

export const metadata: Metadata = {
  title: "Enter the Arena — Underhyped",
  description: "Two links. That’s the whole form.",
};

// The header's and Home's "Enter the Arena" — DECISIONS.md § 2026-10-06.
// Checked here on the server, so typing /submit can't skip a step.
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const state = await getEntryState();
  if (state.kind === "needs-profile") redirect(onboardingFor("/submit"));
  if (state.kind === "in-arena") redirect(`/c/${state.username}`);

  return (
    <main className="flex w-full flex-1 flex-col px-4 pb-16">
      {state.kind === "signed-out" ? (
        <EntryGate variant="arena" next="/submit" back="/" />
      ) : (
        <EnterArenaFlow handle={state.handle} projectUrl={state.projectUrl} />
      )}
    </main>
  );
}
