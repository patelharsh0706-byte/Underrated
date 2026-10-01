import { DemosJudge } from "@/components/demos/demos-judge";
import { MakerCard } from "@/components/demos/maker-card";

export const metadata = {
  title: "Demos · Underhyped",
  description: "15 seconds. No pitch deck. Does this deserve more hype?",
};

// Underhyped Demos — the judging loop (DESIGN.md § Demos (V3)). Phase 1 runs
// on sample data; nothing is saved.
export default function DemosPage() {
  return (
    <>
      <DemosJudge />
      <MakerCard />
    </>
  );
}
