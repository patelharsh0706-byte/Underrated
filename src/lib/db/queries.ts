import "server-only";

import { and, desc, eq, getTableColumns, gt, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { battles, creators, sponsorships, visitorPings } from "@/lib/db/schema";
import type { CreatorFields } from "@/lib/creator-schema";
import {
  DAILY_HEAT_BATTLES_REQUIRED,
  DAILY_HEAT_VOTERS_REQUIRED,
} from "@/lib/ranking/daily-heat";
import {
  isPlacementTurn,
  isRanked,
  PLACEMENT_BATTLES_REQUIRED,
  PLACEMENT_VOTERS_REQUIRED,
} from "@/lib/ranking/placement";
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
  /** Distinct voter sessions that judged this creator — see RANKING.md § Placement. */
  voterCount: number;
  workUrl: string | null;
  socials: Record<string, string> | null;
  primarySocial: string | null;
  followerCount: number | null;
}

/**
 * Distinct sessions that judged a creator, won or lost. Derived on every read
 * rather than stored, per RANKING.md — placement must never be a column that
 * can drift from the battle log. Correlated on `creators.id`, so it composes
 * into any select or where clause over `creators`.
 *
 * The correlation is written `${creators}.id`, not `${creators.id}`, and must
 * stay that way. Drizzle renders a *column* unqualified in a single-table
 * SELECT list ("id") but qualified in a WHERE ("creators"."id") — so the
 * column form silently became `b.creator_a_id = b.id` inside this subquery,
 * matching nothing and reporting 0 voters for everyone. A *table* reference
 * always renders as its quoted name, so this form is context-independent.
 */
const voterCountSql = sql<number>`(
  select count(distinct b.voter_session)::int
  from ${battles} b
  where b.creator_a_id = ${creators}.id or b.creator_b_id = ${creators}.id
)`;

/** Every creator column plus the derived voter count. */
const creatorSelection = { ...getTableColumns(creators), voterCount: voterCountSql };

/** Both placement conditions, as a SQL predicate. Mirrors `isRanked`. */
const isRankedSql = sql`${creators.battlesCount} >= ${PLACEMENT_BATTLES_REQUIRED}
  and ${voterCountSql} >= ${PLACEMENT_VOTERS_REQUIRED}`;

type CreatorRow = typeof creators.$inferSelect & { voterCount: number };

function toPublicCreator(row: CreatorRow): PublicCreator {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    category: row.category,
    aura: row.aura,
    battlesCount: row.battlesCount,
    voterCount: row.voterCount,
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
export async function getRandomPair(
  voterSession?: string | null,
): Promise<[PublicCreator, PublicCreator]> {
  // Alternate the placement slot on the voter's own battle count. With a small
  // pool the unranked set is often one person, so an unconditional guarantee
  // put that creator in every single battle. See RANKING.md § Pairing.
  let placementTurn = true;
  if (voterSession) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(battles)
      .where(eq(battles.voterSession, voterSession));
    placementTurn = isPlacementTurn(count);
  }

  // Choose the unordered pair directly rather than two creators independently:
  // "has this session already judged A vs B" is a property of the pair, and
  // picking sides separately can only reject a repeat after the fact. Derived
  // every request — a new creator instantly revives an exhausted session.
  // See RANKING.md § Pairing.
  const chosen = await db.execute(sql`
    select p.a_id, p.b_id
    from (
      select a.id as a_id,
             b.id as b_id,
             least(a.battles_count, ${PLACEMENT_BATTLES_REQUIRED})
               + least(b.battles_count, ${PLACEMENT_BATTLES_REQUIRED}) as base,
             (a.battles_count < ${PLACEMENT_BATTLES_REQUIRED}
               or b.battles_count < ${PLACEMENT_BATTLES_REQUIRED}) as has_unranked
      from ${creators} a
      join ${creators} b on a.id < b.id
      where a.is_active = true
        and b.is_active = true
        and not exists (
          select 1 from ${battles} x
          where x.voter_session = ${voterSession ?? null}
            and least(x.creator_a_id, x.creator_b_id) = a.id
            and greatest(x.creator_a_id, x.creator_b_id) = b.id
        )
    ) p
    order by
      case when ${placementTurn} and p.has_unranked then 0 else 1 end,
      p.base + random() * 50
    limit 1
  `);

  const [pair] = Array.from(chosen as unknown as { a_id: string; b_id: string }[]);

  // Every pair judged. Fall back to the plain draw so the voter keeps playing;
  // scoring declines the repeat. Resolves itself when the pool grows.
  const ids = pair
    ? [pair.a_id, pair.b_id]
    : (
        await db
          .select({ id: creators.id })
          .from(creators)
          .where(eq(creators.isActive, true))
          .orderBy(sql`random()`)
          .limit(2)
      ).map((r) => r.id);

  if (ids.length < 2) {
    throw new Error("Not enough active creators for a battle");
  }

  const rows = await db
    .select(creatorSelection)
    .from(creators)
    .where(inArray(creators.id, ids));

  if (rows.length < 2) {
    throw new Error("Not enough active creators for a battle");
  }

  // Randomise which side each creator lands on — the query returns them in a
  // fixed id order, which would otherwise pin the same creator to the left.
  const [a, b] = Math.random() < 0.5 ? rows : [rows[1], rows[0]];
  return [toPublicCreator(a), toPublicCreator(b)];
}

export interface LeaderboardEntry extends PublicCreator {
  rank: number;
}

/**
 * Ranked active creators ordered by Aura. Excludes anyone still in placement —
 * too few battles, or too few distinct people judging them — see RANKING.md §
 * Placement. Rank is derived, never stored — see DATABASE.md.
 */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select(creatorSelection)
    .from(creators)
    .where(and(eq(creators.isActive, true), isRankedSql))
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
    .select(creatorSelection)
    .from(creators)
    .where(and(eq(creators.username, username), eq(creators.isActive, true)));

  if (!row) return null;

  let rank: number | null = null;
  if (isRanked(row.battlesCount, row.voterCount)) {
    // Position among ranked creators only — an unranked creator with higher
    // Aura must not push this one down a place.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creators)
      .where(and(eq(creators.isActive, true), isRankedSql, sql`${creators.aura} > ${row.aura}`));
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
  voter_count: number;
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
      (
        select count(distinct v.voter_session)::int
        from battles v
        where v.creator_a_id = c.id or v.creator_b_id = c.id
      ) as voter_count,
      count(*) filter (where b.winner_id = c.id)::int as wins_today,
      count(*) filter (where b.winner_id != c.id)::int as losses_today,
      count(*)::int as battles_today,
      count(distinct b.voter_session)::int as voters_today
    from creators c
    join battles b on b.creator_a_id = c.id or b.creator_b_id = c.id
    where c.is_active = true
      and b.created_at >= date_trunc('day', now() at time zone 'utc')
    group by c.id, c.username, c.name, c.avatar_url, c.bio, c.category, c.aura,
      c.battles_count, c.work_url, c.socials, c.primary_social, c.follower_count
    having count(*) >= ${DAILY_HEAT_BATTLES_REQUIRED}
      and count(distinct b.voter_session) >= ${DAILY_HEAT_VOTERS_REQUIRED}
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
    voterCount: row.voter_count,
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
