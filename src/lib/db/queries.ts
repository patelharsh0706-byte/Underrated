import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { creators } from "@/lib/db/schema";

export interface PublicCreator {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  category: string | null;
  aura: number;
  workUrl: string | null;
  socials: Record<string, string> | null;
  primarySocial: string | null;
  followerCount: number | null;
}

function toPublicCreator(row: typeof creators.$inferSelect): PublicCreator {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    category: row.category,
    aura: row.aura,
    workUrl: row.workUrl,
    socials: row.socials as Record<string, string> | null,
    primarySocial: row.primarySocial,
    followerCount: row.followerCount,
  };
}

/**
 * Picks two distinct active creators for a battle, biased toward creators
 * with fewer battles so new entries get rated quickly. See RANKING.md.
 */
export async function getRandomPair(): Promise<[PublicCreator, PublicCreator]> {
  const rows = await db
    .select()
    .from(creators)
    .where(sql`${creators.isActive} = true`)
    .orderBy(sql`${creators.battlesCount} + random() * 50`)
    .limit(2);

  if (rows.length < 2) {
    throw new Error("Not enough active creators for a battle");
  }

  const [a, b] = rows;
  return [toPublicCreator(a), toPublicCreator(b)];
}

export interface LeaderboardEntry extends PublicCreator {
  rank: number;
}

/** Active creators ordered by Aura. Rank is derived, never stored — see DATABASE.md. */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select()
    .from(creators)
    .where(eq(creators.isActive, true))
    .orderBy(desc(creators.aura))
    .limit(limit);

  return rows.map((row, index) => ({ ...toPublicCreator(row), rank: index + 1 }));
}

export interface CreatorProfile extends PublicCreator {
  rank: number;
  battlesCount: number;
  winsCount: number;
}

export async function getCreatorByUsername(username: string): Promise<CreatorProfile | null> {
  const [row] = await db
    .select()
    .from(creators)
    .where(and(eq(creators.username, username), eq(creators.isActive, true)));

  if (!row) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(creators)
    .where(and(eq(creators.isActive, true), sql`${creators.aura} > ${row.aura}`));

  return {
    ...toPublicCreator(row),
    rank: count + 1,
    battlesCount: row.battlesCount,
    winsCount: row.winsCount,
  };
}

export interface DailyHeatEntry extends PublicCreator {
  rank: number;
  dailyHeat: number;
  battlesToday: number;
}

interface DailyHeatRow {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  category: string | null;
  aura: number;
  work_url: string | null;
  socials: Record<string, string> | null;
  primary_social: string | null;
  follower_count: number | null;
  wins_today: number;
  losses_today: number;
  battles_today: number;
}

/**
 * Top creators by Daily Heat (wins today - losses today), UTC calendar day.
 * Rank 1 is the Main Character. A creator needs at least 5 battles today to
 * qualify — see RANKING.md.
 */
export async function getTop24h(limit = 10): Promise<DailyHeatEntry[]> {
  const result = await db.execute(sql`
    select
      c.id,
      c.username,
      c.name,
      c.avatar_url,
      c.bio,
      c.category,
      c.aura,
      c.work_url,
      c.socials,
      c.primary_social,
      c.follower_count,
      count(*) filter (where b.winner_id = c.id)::int as wins_today,
      count(*) filter (where b.winner_id != c.id)::int as losses_today,
      count(*)::int as battles_today
    from creators c
    join battles b on b.creator_a_id = c.id or b.creator_b_id = c.id
    where c.is_active = true
      and b.created_at >= date_trunc('day', now() at time zone 'utc')
    group by c.id, c.username, c.name, c.avatar_url, c.bio, c.category, c.aura,
      c.work_url, c.socials, c.primary_social, c.follower_count
    having count(*) >= 5
    order by
      (count(*) filter (where b.winner_id = c.id) - count(*) filter (where b.winner_id != c.id)) desc,
      (count(*) filter (where b.winner_id = c.id)::float8 / count(*)) desc,
      count(*) desc,
      c.aura asc
    limit ${limit}
  `);

  return Array.from(result as unknown as DailyHeatRow[]).map((row, index) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    category: row.category,
    aura: row.aura,
    workUrl: row.work_url,
    socials: row.socials,
    primarySocial: row.primary_social,
    followerCount: row.follower_count,
    rank: index + 1,
    dailyHeat: row.wins_today - row.losses_today,
    battlesToday: row.battles_today,
  }));
}
