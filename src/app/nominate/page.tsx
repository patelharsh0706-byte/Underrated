import type { Metadata } from "next";

import { NominateFlow } from "@/components/nominate/nominate-flow";

export const metadata: Metadata = {
  title: "Nominate — Underhyped",
  description: "Who is the internet sleeping on?",
};

export default function NominatePage() {
  return (
    <main className="flex w-full flex-1 flex-col px-4 pb-16">
      <NominateFlow />
    </main>
  );
}
