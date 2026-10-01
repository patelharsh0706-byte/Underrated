import type { ReactNode } from "react";

import { DemosProvider } from "@/components/demos/demos-state";
import s from "@/components/demos/demos.module.css";
import type { SampleDemo } from "@/components/demos/sample-demos";
import { isMockMode } from "@/lib/db/mock-data";
import { getApprovedDemos, getJudgedDemoIds } from "@/lib/demos/queries";
import { queueOrder } from "@/lib/demos/rank";
import { readVoterSession } from "@/lib/session";

// Underhyped Demos (DECISIONS.md § 2026-09-30, § 2026-10-01). Real demos and
// this visitor's queue are read once here and shared by Judge, Top and
// Submit. PREVIEW_MOCK=1 keeps the Phase 1 sample data.
export const dynamic = "force-dynamic";

const COLORS = ["#6B5BD6", "#0F7B7B", "#B4603A", "#2F6BE0", "#C4399E", "#1D8E45", "#E0A100", "#111111"];
function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

async function loadLive() {
  const [rows, judged] = await Promise.all([getApprovedDemos(), readVoterSession().then(getJudgedDemoIds)]);
  const demos: SampleDemo[] = rows.map((r) => ({
    id: r.id,
    drop: r.drop,
    name: r.name,
    tag: r.tag,
    host: r.host,
    url: r.url,
    color: colorFor(r.name),
    cat: r.cat,
    trend: r.today,
    judges: r.judges,
    underhyped: r.underhyped,
    clicks: r.clicks,
    videoUrl: r.videoUrl,
  }));
  return { live: true, demos, queue: queueOrder(rows, judged) };
}

export default async function DemosLayout({ children }: { children: ReactNode }) {
  let initial: Awaited<ReturnType<typeof loadLive>> | null = null;
  if (!isMockMode()) {
    try {
      initial = await loadLive();
    } catch (error) {
      // e.g. before the 0011 demos migration is applied — show "no demos yet"
      // rather than a broken page.
      console.error("Demos: couldn't load demos", error);
      initial = { live: true, demos: [], queue: [] };
    }
  }
  return (
    <DemosProvider initial={initial}>
      <main className={s.wrap}>{children}</main>
    </DemosProvider>
  );
}
