"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { isMockMode, mockHomeStats } from "@/lib/db/mock-data";
import { visitorPings } from "@/lib/db/schema";
import { getHomeStats, type HomeStats } from "@/lib/db/queries";
import { getOrCreateVoterSession } from "@/lib/session";

/**
 * Records a heartbeat for the current anonymous visitor (same `voter_session`
 * identity battles already use — see DATABASE.md#visitor_pings) and returns
 * the freshly computed stats bundle in the same round trip, so the client
 * doesn't need a second request to refresh the numbers it just moved.
 *
 * A ping more than 30 minutes after the visitor's last one counts as a new
 * site visit; "N here now" counts pings within the last 90 seconds. The
 * client calls this every 45s while the tab is visible.
 */
export async function pingVisitor(): Promise<HomeStats> {
  // PREVIEW_MOCK=1 — see src/lib/db/mock-data.ts. No heartbeat is written.
  if (isMockMode()) return mockHomeStats();
  const voterSession = await getOrCreateVoterSession();

  await db
    .insert(visitorPings)
    .values({ voterSession })
    .onConflictDoUpdate({
      target: visitorPings.voterSession,
      set: {
        lastSeenAt: sql`now()`,
        visitCount: sql`${visitorPings.visitCount} + case when ${visitorPings.lastSeenAt} < now() - interval '30 minutes' then 1 else 0 end`,
      },
    });

  return getHomeStats();
}
