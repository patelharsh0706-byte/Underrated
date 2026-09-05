import "server-only";

import { and, desc, eq, gt, lte, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { battles, creators, sponsorships, visitorPings } from "@/lib/db/schema";
import type { CreatorFields } from "@/lib/creator-schema";
import { PLACEMENT_BATTLES_REQUIRED } from "@/lib/ranking/placement";
import { getCreatorAvatarUrl } from "@/lib/unavatar";

export interface PublicCreator {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  category: string | null;
  aura: number;
  battlesCount: number;
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
    battlesCount: row.battlesCount,
    workUrl: row.workUrl,
    socials: row.socials as Record<string, string> | null,
    primarySocial: row.primarySocial,
    followerCount: row.followerCount,
  };
}

/**
 * Picks two distinct active creators for a battle. Whenever any active
 * creator is still in placement (fewer than PLACEMENT_BATTLES_REQUIRED
 * battles), one slot is guaranteed to go to one of them — weighted random,
 * favoring fewest battles — so placement reliably completes instead of
 * stalling as the pool grows. The other slot is drawn from the full active
 * pool with the existing mild bias toward fewer battles. See RANKING.md.
 */
export async function getRandomPair(): Promise<[PublicCreator, PublicCreator]> {
  const [placementRow] = await db
    .select()
    .from(creators)
    .where(
      and(eq(creators.isActive, true), sql`${creators.battlesCount} < ${PLACEMENT_BATTLES_REQUIRED}`),
    )
    .orderBy(sql`${creators.battlesCount} + random() * 5`)
    .limit(1);

  const opponentFilter = placementRow
    ? and(eq(creators.isActive, true), ne(creators.id, placementRow.id))
    : eq(creators.isActive, true);

  const opponentRows = await db
    .select()
    .from(creators)
    .where(opponentFilter)
    .orderBy(sql`${creators.battlesCount} + random() * 50`)
    .limit(placementRow ? 1 : 2);

  const rows = placementRow ? [placementRow, ...opponentRows] : opponentRows;
  if (rows.length < 2) {
    throw new Error("Not enough active creators for a battle");
  }

  const [a, b] = rows;
  return [toPublicCreator(a), toPublicCreator(b)];
}

export interface LeaderboardEntry extends PublicCreator {
  rank: number;
}

/**
 * Ranked active creators ordered by Aura. Excludes anyone still in
 * placement (< PLACEMENT_BATTLES_REQUIRED battles) — see RANKING.md §
 * Placement. Rank is derived, never stored — see DATABASE.md.
 */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select()
    .from(creators)
    .where(
      and(eq(creators.isActive, true), sql`${creators.battlesCount} >= ${PLACEMENT_BATTLES_REQUIRED}`),
    )
    .orderBy(desc(creators.aura))
    .limit(limit);

  return rows.map((row, index) => ({ ...toPublicCreator(row), rank: index + 1 }));
}

export interface CreatorProfile extends PublicCreator {
  /** Null while the creator is still in placement — see RANKING.md § Placement. */
  rank: number | null;
  battlesCount: number;
  winsCount: number;
}

export async function getCreatorByUsername(username: string): Promise<CreatorProfile | null> {
  const [row] = await db
    .select()
    .from(creators)
    .where(and(eq(creators.username, username), eq(creators.isActive, true)));

  if (!row) return null;

  let rank: number | null = null;
  if (row.battlesCount >= PLACEMENT_BATTLES_REQUIRED) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creators)
      .where(
        and(
          eq(creators.isActive, true),
          sql`${creators.battlesCount} >= ${PLACEMENT_BATTLES_REQUIRED}`,
          sql`${creators.aura} > ${row.aura}`,
        ),
      );
    rank = count + 1;
  }

  return {
    ...toPublicCreator(row),
    rank,
    battlesCount: row.battlesCount,
    winsCount: row.winsCount,
  };
}

/** Checked before payment — never charge someone for a taken username. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const [row] = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.username, username));

  return !!row;
}

/** Used by /submit/success to find the creator a completed payment produced. */
export async function getCreatorByPaymentId(
  paymentId: string,
): Promise<{ username: string } | null> {
  const [row] = await db
    .select({ username: creators.username })
    .from(creators)
    .where(eq(creators.dodoPaymentId, paymentId));

  return row ?? null;
}

/**
 * Inserts a creator row from validated submission fields. Shared by the Dodo
 * webhook (real payment) and, temporarily, `createSubmissionCheckout` itself
 * while Dodo isn't wired up yet — see the TODO there. Avatar is always
 * derived server-side from the primary social link, never accepted from the
 * client — see ARCHITECTURE.md § Creator avatars.
 */
export async function insertCreator(
  data: CreatorFields,
  payment: { entryFeeCents: number | null; dodoPaymentId: string | null },
): Promise<{ username: string } | null> {
  const primaryLink = data.socials[data.primarySocial as keyof typeof data.socials] ?? null;
  const avatarUrl = getCreatorAvatarUrl(primaryLink, data.username);

  const [row] = await db
    .insert(creators)
    .values({
      username: data.username,
      name: data.name,
      avatarUrl,
      bio: data.bio || null,
      category: data.category,
      workUrl: data.workUrl,
      socials: data.socials,
      primarySocial: data.primarySocial,
      followerCount: data.followerCount ?? null,
      entryFeeCents: payment.entryFeeCents,
      dodoPaymentId: payment.dodoPaymentId,
    })
    .onConflictDoNothing({ target: creators.dodoPaymentId })
    .returning({ username: creators.username });

  return row ?? null;
}

/** Kept for a future claim/manage-profile flow — see DECISIONS.md 2026-09-05. */
export async function getCreatorByUserId(
  userId: string,
): Promise<{ username: string } | null> {
  const [row] = await db
    .select({ username: creators.username })
    .from(creators)
    .where(eq(creators.userId, userId));

  return row ?? null;
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
  battles_count: number;
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
      c.battles_count,
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
      c.battles_count, c.work_url, c.socials, c.primary_social, c.follower_count
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
    battlesCount: row.battles_count,
    workUrl: row.work_url,
    socials: row.socials,
    primarySocial: row.primary_social,
    followerCount: row.follower_count,
    rank: index + 1,
    dailyHeat: row.wins_today - row.losses_today,
    battlesToday: row.battles_today,
  }));
}

export interface ActiveSponsorship {
  sponsorName: string;
  // Null means the sponsor chose no logo — render a monogram, not a broken
  // image. See DATABASE.md.
  imageUrl: string | null;
  description: string | null;
  targetUrl: string;
  endAt: Date;
}

/** The one sponsor slot, if a paid-up one is currently live. See DATABASE.md. */
export async function getActiveSponsorship(): Promise<ActiveSponsorship | null> {
  const now = new Date();
  const [row] = await db
    .select({
      sponsorName: sponsorships.sponsorName,
      imageUrl: sponsorships.imageUrl,
      description: sponsorships.description,
      targetUrl: sponsorships.targetUrl,
      endAt: sponsorships.endAt,
    })
    .from(sponsorships)
    .where(and(lte(sponsorships.startAt, now), gt(sponsorships.endAt, now)));

  return row ?? null;
}

/**
 * Slot queues automatically, back to back — nobody picks dates, so
 * overlapping sponsorships are impossible by construction. Returns when the
 * next purchase would start: now, if the slot is free; otherwise right after
 * the last booked sponsorship ends.
 */
export async function getNextSponsorshipStart(): Promise<Date> {
  const [row] = await db
    .select({ endAt: sponsorships.endAt })
    .from(sponsorships)
    .orderBy(desc(sponsorships.endAt))
    .limit(1);

  const now = new Date();
  if (!row || row.endAt <= now) return now;
  return row.endAt;
}

export interface HomeStats {
  visitorsSoFar: number;
  battlesSoFar: number;
  battlesToday: number;
  creatorsInArena: number;
  paidForBattlesCents: number;
  siteVisits: number;
  onlineNow: number;
}

/** Powers the homepage's live stats bar. See DATABASE.md#visitor_pings. */
export async function getHomeStats(): Promise<HomeStats> {
  const [
    [visitorRow],
    [{ battlesSoFar }],
    [{ battlesToday }],
    [{ creatorsInArena }],
    [{ paidForBattlesCents }],
  ] = await Promise.all([
    db
      .select({
        visitorsSoFar: sql<number>`count(*)::int`,
        siteVisits: sql<number>`coalesce(sum(${visitorPings.visitCount}), 0)::int`,
        onlineNow: sql<number>`count(*) filter (where ${visitorPings.lastSeenAt} > now() - interval '90 seconds')::int`,
      })
      .from(visitorPings),
    db.select({ battlesSoFar: sql<number>`count(*)::int` }).from(battles),
    // Same UTC-day boundary getTop24h uses, so this counter resets at the
    // exact instant Daily Heat and Main Character do.
    db
      .select({ battlesToday: sql<number>`count(*)::int` })
      .from(battles)
      .where(sql`${battles.createdAt} >= date_trunc('day', now() at time zone 'utc')`),
    db
      .select({ creatorsInArena: sql<number>`count(*)::int` })
      .from(creators)
      .where(eq(creators.isActive, true)),
    db
      .select({ paidForBattlesCents: sql<number>`coalesce(sum(${creators.entryFeeCents}), 0)::int` })
      .from(creators),
  ]);

  return {
    visitorsSoFar: visitorRow?.visitorsSoFar ?? 0,
    siteVisits: visitorRow?.siteVisits ?? 0,
    onlineNow: visitorRow?.onlineNow ?? 0,
    battlesSoFar,
    battlesToday,
    creatorsInArena,
    paidForBattlesCents,
  };
}

export interface RecentJoin {
  username: string;
  name: string;
  entryFeeCents: number | null;
  createdAt: Date;
}

/** "Just happened" feed on the homepage — most recently submitted creators. */
export async function getRecentJoins(limit = 5): Promise<RecentJoin[]> {
  return db
    .select({
      username: creators.username,
      name: creators.name,
      entryFeeCents: creators.entryFeeCents,
      createdAt: creators.createdAt,
    })
    .from(creators)
    .orderBy(desc(creators.createdAt))
    .limit(limit);
}
