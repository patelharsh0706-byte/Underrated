import type { Metadata } from "next";

import { SubmitForm } from "@/components/submit/submit-form";

export const metadata: Metadata = {
  title: "Submit yourself — Underhyped",
};

export default function SubmitPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit yourself</h1>
        <p className="text-sm text-muted-foreground">
          No account needed — a one-time $3 entry fee gets you in. Your work link is
          what lets voters make an informed pick, so make it your strongest
          evidence.
        </p>
      </div>

      <SubmitForm />
    </main>
  );
}
