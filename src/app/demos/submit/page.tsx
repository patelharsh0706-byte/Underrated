import { redirect } from "next/navigation";

import { EntryGate } from "@/components/auth/entry-gate";
import { DemosSubmit } from "@/components/demos/demos-submit";
import { getEntryState } from "@/lib/account";
import { onboardingFor } from "@/lib/entry-gate";

export const metadata = {
  title: "Submit your demo · Underhyped",
  description: "15 seconds to make us care. Upload a screen recording of your product.",
};

// Sign in with X and a finished profile come first — DECISIONS.md § 2026-10-06.
export const dynamic = "force-dynamic";

// Dodo's static link sends a paid maker back here with ?paid=1 → "In review",
// shown without the gate: the payment is already made.
export default async function DemosSubmitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { paid } = await searchParams;
  if (paid === "1") return <DemosSubmit paid />;

  const state = await getEntryState();
  if (state.kind === "needs-profile") redirect(onboardingFor("/demos/submit"));
  if (state.kind === "signed-out") return <EntryGate variant="submitDemo" next="/demos/submit" back="/demos" />;
  return <DemosSubmit email={state.email} />;
}
