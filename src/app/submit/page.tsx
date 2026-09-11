import type { Metadata } from "next";

import { EnterArenaFlow } from "@/components/submit/enter-arena-flow";

export const metadata: Metadata = {
  title: "Enter the Arena — Underhyped",
  description: "Two links. That’s the whole form.",
};

export default function SubmitPage() {
  return (
    <main className="flex w-full flex-1 flex-col px-4 pb-16">
      <EnterArenaFlow />
    </main>
  );
}
