import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { demoClicks, demoJudgements, demos } from "@/lib/db/schema";

// Underhyped Demos reads (RANKING.md § Demos). Every tally counts the last
// 7 × 24h; "today" is the last 24h. Drop numbers are derived, never stored.

export interface DemoRow {
  id: string;
  drop: number;
  name: string;
  tag: string;
  url: string;
  host: string;
  cat: string;
  videoUrl: string;
  videoWidth: number | null;
  videoHeight: number | null;
  judges: number;
  underhyped: number;
  clicks: number;
  today: number;
  createdAt: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Approved demos with their 7-day tallies, oldest first (drop order).
 *
 * The correlations are written `${demos}.id`, never `${demos.id}` — the same
 * trap documented on voterCountSql in db/queries.ts: Drizzle renders a column
 * unqualified ("id") in a single-table SELECT list, so inside these subqueries
 * it silently became `j.demo_id = j.id` and every demo counted 0 judges.
 */
export async function getApprovedDemos(): Promise<DemoRow[]> {
  const week = sql`now() - interval '7 days'`;
  const day = sql`now() - interval '1 day'`;
  const rows = await db
    .select({
      id: demos.id,
      name: demos.productName,
      tag: demos.tagline,
      url: demos.productUrl,
      cat: demos.category,
      videoUrl: demos.videoUrl,
      videoWidth: demos.videoWidth,
      videoHeight: demos.videoHeight,
      createdAt: demos.createdAt,
      judges: sql<number>`(select count(*)::int from ${demoJudgements} j where j.demo_id = ${demos}.id and j.created_at >= ${week})`,
      underhyped: sql<number>`(select count(*)::int from ${demoJudgements} j where j.demo_id = ${demos}.id and j.created_at >= ${week} and j.verdict = 'underhyped')`,
      clicks: sql<number>`(select count(*)::int from ${demoClicks} c where c.demo_id = ${demos}.id and c.created_at >= ${week})`,
      today: sql<number>`(select count(*)::int from ${demoJudgements} j where j.demo_id = ${demos}.id and j.created_at >= ${day})`,
    })
    .from(demos)
    .where(eq(demos.status, "approved"))
    .orderBy(demos.createdAt);

  return rows.map((r, i) => ({
    ...r,
    drop: i + 1,
    host: hostOf(r.url),
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Demo ids this visitor has already judged (any time). */
export async function getJudgedDemoIds(voterSession: string | null): Promise<string[]> {
  if (!voterSession) return [];
  const rows = await db
    .select({ id: demoJudgements.demoId })
    .from(demoJudgements)
    .where(eq(demoJudgements.voterSession, voterSession));
  return rows.map((r) => r.id);
}

/** One demo's current 7-day tallies — returned after a judgement or click. */
export async function getDemoTally(demoId: string): Promise<{ judges: number; underhyped: number; clicks: number }> {
  const week = sql`now() - interval '7 days'`;
  const [j] = await db
    .select({
      judges: sql<number>`count(*)::int`,
      underhyped: sql<number>`count(*) filter (where ${demoJudgements.verdict} = 'underhyped')::int`,
    })
    .from(demoJudgements)
    .where(and(eq(demoJudgements.demoId, demoId), gte(demoJudgements.createdAt, week)));
  const [c] = await db
    .select({ clicks: sql<number>`count(*)::int` })
    .from(demoClicks)
    .where(and(eq(demoClicks.demoId, demoId), gte(demoClicks.createdAt, week)));
  return { judges: j?.judges ?? 0, underhyped: j?.underhyped ?? 0, clicks: c?.clicks ?? 0 };
}
