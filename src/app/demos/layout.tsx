import type { ReactNode } from "react";

import { DemosProvider } from "@/components/demos/demos-state";
import s from "@/components/demos/demos.module.css";

// Underhyped Demos (DECISIONS.md § 2026-09-30). The provider keeps Phase 1
// sample votes alive while moving between Judge, Top and Submit.
export default function DemosLayout({ children }: { children: ReactNode }) {
  return (
    <DemosProvider>
      <main className={s.wrap}>{children}</main>
    </DemosProvider>
  );
}
