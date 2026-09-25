import "server-only";

import { and, desc, eq, getTableColumns, gt, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { battles, creators, nominate, payments, sponsorships, visitorPings } from "@/lib/db/schema";
import type { HomeLiveCounts } from "@/lib/home-live";
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
import { storeCreatorAvatar } from "@/lib/avatar-store";

export interface PublicCreator {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  category: string | null;
  aura: number;
  battlesCount: number;
  /** Battles won. Shown as the creator's Hype (⚡) — PRODUCT.md § Terminology. */
  winsCount: number;
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
    winsCount: row.winsCount,
    voterCount: row.voterCount,
    workUrl: row.workUrl,
    socials: row.socials as Record<string, string> | null,
    primarySocial: row.primarySocial,
    followerCount: row.followerCount,
  };
}

/**
 * Picks two distinct active creators for a battle: one ordered pass over every
 * active pair — see RANKING.md § Pairing.
 *   1. pairs containing a creator from the battle just shown go last,
 *   2. pairs this session already judged come after unjudged ones,
 *   3. on a placement turn, pairs with an unranked creator come first,
 *   4. then the capped battle-count bias plus randomness.
 * The order is the point. No-back-to-back outranks unjudged-first, so a voter
 * who has judged everything but a newcomer's pairs alternates the newcomer
 * with repeats instead of seeing them every battle (ISSUES.md § 2026-09-24).
 */
export async function getRandomPair(
  voterSession?: string | null,
  excludeIds: string[] = [],
): Promise<[PublicCreator, PublicCreator]> {
  // Sort keys, not filters, so even a two-creator pool returns a pair. The
  // empty case must be an expression: a bare `0` in ORDER BY is read as a
  // column position.
  const excluded = sql.join(
    excludeIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const pairHasExcluded = excludeIds.length
    ? sql`(p.a_id in (${excluded}) or p.b_id in (${excluded}))`
    : sql`false`;

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
  // "has this session already judged A vs B" is a property of the pair.
  // Derived every request — a new creator instantly revives an exhausted
  // session. A session that has judged every pair is not a special case: key
  // 2 is simply 1 everywhere, and scoring declines the repeat.
  const chosen = await db.execute(sql`
    select p.a_id, p.b_id
    from (
      select a.id as a_id,
             b.id as b_id,
             least(a.battles_count, ${PLACEMENT_BATTLES_REQUIRED})
               + least(b.battles_count, ${PLACEMENT_BATTLES_REQUIRED}) as base,
             (a.battles_count < ${PLACEMENT_BATTLES_REQUIRED}
               or b.battles_count < ${PLACEMENT_BATTLES_REQUIRED}) as has_unranked,
             exists (
               select 1 from ${battles} x
               where x.voter_session = ${voterSession ?? null}
                 and least(x.creator_a_id, x.creator_b_id) = a.id
                 and greatest(x.creator_a_id, x.creator_b_id) = b.id
             ) as judged
      from ${creators} a
      join ${creators} b on a.id < b.id
      where a.is_active = true
        and b.is_active = true
    ) p
    order by
      case when ${pairHasExcluded} then 1 else 0 end,
      case when p.judged then 1 else 0 end,
      case when ${placementTurn} and p.has_unranked then 0 else 1 end,
      p.base + random() * 50
    limit 1
  `);

  const [pair] = Array.from(chosen as unknown as { a_id: string; b_id: string }[]);
  if (!pair) {
    throw new Error("Not enough active creators for a battle");
  }

  const rows = await db
    .select(creatorSelection)
    .from(creators)
    .where(inArray(creators.id, [pair.a_id, pair.b_id]));

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
  // Fetched once and stored in Blob; falls back to Dicebear on any failure
  // and never throws. See ARCHITECTURE.md § Creator avatars.
  const { url: avatarUrl } = await storeCreatorAvatar(primaryLink, data.username);

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

/**
 * The ledger of money received — one row per successful Dodo payment,
 * written before any attempt to turn it into a creator. Idempotent on
 * dodo_payment_id: Dodo retries webhooks on any non-2xx, and Vercel cold
 * starts cause exactly that. See DATABASE.md § payments.
 */
export async function recordPayment(input: {
  dodoPaymentId: string;
  amountCents: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  xProfileUrl: string | null;
  workUrl: string | null;
  metadata: unknown;
}): Promise<void> {
  await db
    .insert(payments)
    .values({
      dodoPaymentId: input.dodoPaymentId,
      amountCents: input.amountCents,
      currency: input.currency,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      xProfileUrl: input.xProfileUrl,
      workUrl: input.workUrl,
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing({ target: payments.dodoPaymentId });
}

/**
 * Ties a ledger row to its creator once one exists. Both tables carry the
 * same dodo_payment_id, so this is a join, not a second lookup — and it's
 * safe to call when no creator was created (it simply sets nothing).
 */
export async function linkPaymentToCreator(dodoPaymentId: string): Promise<void> {
  await db
    .update(payments)
    .set({
      creatorId: sql`(select ${creators.id} from ${creators} where ${creators.dodoPaymentId} = ${dodoPaymentId})`,
    })
    .where(eq(payments.dodoPaymentId, dodoPaymentId));
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
  /**
   * Aura gained or lost today, summed from the `aura_*_after/before` columns
   * of today's battles. This is NOT rank movement — rank movement needs the
   * unbuilt `rank_snapshots` table, and RANKING.md § Rank movement names this
   * number as the honest thing to show in its place until that table exists.
   */
  auraChangeToday: number;
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
  wins_count: number;
  wins_today: number;
  losses_today: number;
  battles_today: number;
  aura_change_today: number;
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
      c.wins_count,
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
      -- Aura actually moved today. Folds into the aggregate already running,
      -- so the trend column costs no extra round trip.
      coalesce(sum(
        case when b.creator_a_id = c.id then b.aura_a_after - b.aura_a_before
             else b.aura_b_after - b.aura_b_before end
      ), 0)::int as aura_change_today,
      count(distinct b.voter_session)::int as voters_today
    from creators c
    join battles b on b.creator_a_id = c.id or b.creator_b_id = c.id
    where c.is_active = true
      and b.created_at >= date_trunc('day', now() at time zone 'utc')
    group by c.id, c.username, c.name, c.avatar_url, c.bio, c.category, c.aura,
      c.battles_count, c.wins_count, c.work_url, c.socials, c.primary_social, c.follower_count
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
    winsCount: row.wins_count,
    voterCount: row.voter_count,
    workUrl: row.work_url,
    socials: row.socials,
    primarySocial: row.primary_social,
    followerCount: row.follower_count,
    rank: index + 1,
    dailyHeat: row.wins_today - row.losses_today,
    battlesToday: row.battles_today,
    auraChangeToday: row.aura_change_today,
  }));
}

export interface TopWeekEntry extends PublicCreator {
  rank: number;
  /** Sum of this creator's Aura deltas over the last 7 × 24h. */
  auraChangeWeek: number;
}

/** Aura moved over the rolling 7-day window, correlated on `creators.id` —
 * written `${creators}.id` for the same reason as `voterCountSql`. */
const auraChangeWeekSql = sql<number>`coalesce((
  select sum(
    case when b.creator_a_id = ${creators}.id then b.aura_a_after - b.aura_a_before
         else b.aura_b_after - b.aura_b_before end
  )
  from ${battles} b
  where (b.creator_a_id = ${creators}.id or b.creator_b_id = ${creators}.id)
    and b.created_at >= now() - interval '7 days'
), 0)::int`;

/**
 * Home's "Top 10 This Week" — RANKING.md § Top 10 This Week. Ranked creators
 * only, ordered by Aura gained this week, then current Aura, then battles.
 * A ranked creator with no battles this week has a change of 0, so a quiet
 * week still fills the list, ordered by Aura. Row 1 is Home's #1 card.
 */
export async function getTopWeek(limit = 10): Promise<TopWeekEntry[]> {
  const rows = await db
    .select({ ...creatorSelection, auraChangeWeek: auraChangeWeekSql })
    .from(creators)
    .where(and(eq(creators.isActive, true), isRankedSql))
    .orderBy(desc(auraChangeWeekSql), desc(creators.aura), desc(creators.battlesCount))
    .limit(limit);

  return rows.map((row, index) => ({
    ...toPublicCreator(row),
    rank: index + 1,
    auraChangeWeek: row.auraChangeWeek,
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
  /** Distinct voter sessions across all battles — "people deciding" on the
   * Live on Underhyped panel. Deliberately not "votes cast": one battles row
   * is one pick, so a votes counter would render the same number as
   * battlesSoFar. See DECISIONS.md § 2026-09-10 and DATABASE.md § Derived,
   * Not Stored. */
  peopleDeciding: number;
}

/** Powers the homepage's Live on Underhyped panel. See DATABASE.md#visitor_pings. */
export async function getHomeStats(): Promise<HomeStats> {
  const [
    [visitorRow],
    [{ battlesSoFar }],
    [{ battlesToday }],
    [{ creatorsInArena }],
    [{ paidForBattlesCents }],
    [{ peopleDeciding }],
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
    db
      .select({ peopleDeciding: sql<number>`count(distinct ${battles.voterSession})::int` })
      .from(battles),
  ]);

  return {
    visitorsSoFar: visitorRow?.visitorsSoFar ?? 0,
    siteVisits: visitorRow?.siteVisits ?? 0,
    onlineNow: visitorRow?.onlineNow ?? 0,
    battlesSoFar,
    battlesToday,
    creatorsInArena,
    paidForBattlesCents,
    peopleDeciding,
  };
}

/**
 * Every number Home's "Live on Underhyped" tabs need, in one round trip —
 * the tab switch is client-side over these (src/lib/home-live.ts). UTC day
 * boundary, same as Daily Heat; "week" is a rolling 7 × 24h.
 */
export async function getHomeLive(): Promise<HomeLiveCounts> {
  const today = sql`date_trunc('day', now() at time zone 'utc') at time zone 'utc'`;
  const result = await db.execute(sql`
    select
      (select count(*) from ${battles} where created_at >= ${today})::int as battles_today,
      (select count(*) from ${battles} where created_at >= ${today} - interval '1 day' and created_at < ${today})::int as battles_yesterday,
      (select count(*) from ${battles} where created_at >= now() - interval '7 days')::int as battles_week,
      (select count(*) from ${battles} where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::int as battles_prev_week,
      (select count(*) from ${battles})::int as battles_all,
      (select count(distinct voter_session) from ${battles} where created_at >= ${today})::int as people_today,
      (select count(distinct voter_session) from ${battles} where created_at >= ${today} - interval '1 day' and created_at < ${today})::int as people_yesterday,
      (select count(distinct voter_session) from ${battles} where created_at >= now() - interval '7 days')::int as people_week,
      (select count(distinct voter_session) from ${battles} where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')::int as people_prev_week,
      (select count(distinct voter_session) from ${battles})::int as people_all,
      (select count(*) from ${creators} where is_active = true)::int as creators_total,
      (select count(*) from ${creators} where is_active = true and created_at >= ${today})::int as creators_new_today,
      (select count(*) from ${creators} where is_active = true and created_at >= now() - interval '7 days')::int as creators_new_week,
      (select count(*) from ${nominate} where created_at >= ${today})::int as noms_today,
      (select count(*) from ${nominate} where created_at >= now() - interval '7 days')::int as noms_week,
      (select count(*) from ${nominate})::int as noms_all
  `);
  const [r] = Array.from(result as unknown as Record<string, number>[]);
  return {
    battles: {
      today: r.battles_today,
      yesterday: r.battles_yesterday,
      week: r.battles_week,
      prevWeek: r.battles_prev_week,
      all: r.battles_all,
    },
    people: {
      today: r.people_today,
      yesterday: r.people_yesterday,
      week: r.people_week,
      prevWeek: r.people_prev_week,
      all: r.people_all,
    },
    creators: { total: r.creators_total, newToday: r.creators_new_today, newWeek: r.creators_new_week },
    nominations: { today: r.noms_today, week: r.noms_week, all: r.noms_all },
  };
}

export interface RecentBattleResult {
  winnerName: string;
  winnerUsername: string;
  /** For Home's Live Feed, which shows the winner's face. */
  winnerAvatarUrl: string | null;
  loserName: string;
  loserUsername: string;
  createdAt: Date;
  /**
   * The round-hundred Aura mark the winner crossed on this battle, or null.
   * Read straight off the battle's own `aura_*_before`/`aura_*_after` pair,
   * so it is a fact about a battle that happened, not a guess from a current
   * total. Creators start at 1500, so a first win never counts as "reached
   * 1500" — the crossing has to be strictly above where they already were.
   */
  auraMilestone: number | null;
}

const MILESTONE_STEP = 100;

function milestoneCrossed(before: number, after: number): number | null {
  if (after <= before) return null;
  const mark = Math.floor(after / MILESTONE_STEP) * MILESTONE_STEP;
  return mark > before ? mark : null;
}

/** "Just happened" feed on the Live on Underhyped panel — who beat whom,
 * most recent first. Two lookups, not a join: the second is a single
 * `IN (...)` over the small set of creators actually involved, which reads
 * clearer than aliasing `creators` twice for a winner/loser self-join. */
export async function getRecentBattleResults(limit = 5): Promise<RecentBattleResult[]> {
  const rows = await db
    .select({
      creatorAId: battles.creatorAId,
      creatorBId: battles.creatorBId,
      winnerId: battles.winnerId,
      auraABefore: battles.auraABefore,
      auraBBefore: battles.auraBBefore,
      auraAAfter: battles.auraAAfter,
      auraBAfter: battles.auraBAfter,
      createdAt: battles.createdAt,
    })
    .from(battles)
    .orderBy(desc(battles.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const ids = [...new Set(rows.flatMap((row) => [row.creatorAId, row.creatorBId]))];
  const found = await db
    .select({ id: creators.id, name: creators.name, username: creators.username, avatarUrl: creators.avatarUrl })
    .from(creators)
    .where(inArray(creators.id, ids));
  const byId = new Map(found.map((row) => [row.id, row]));

  return rows.map((row) => {
    const winnerIsA = row.winnerId === row.creatorAId;
    const loserId = winnerIsA ? row.creatorBId : row.creatorAId;
    const winner = byId.get(row.winnerId);
    const loser = byId.get(loserId);

    return {
      winnerName: winner?.name ?? "Someone",
      winnerUsername: winner?.username ?? "",
      winnerAvatarUrl: winner?.avatarUrl ?? null,
      loserName: loser?.name ?? "someone",
      loserUsername: loser?.username ?? "",
      createdAt: row.createdAt,
      auraMilestone: milestoneCrossed(
        winnerIsA ? row.auraABefore : row.auraBBefore,
        winnerIsA ? row.auraAAfter : row.auraBAfter,
      ),
    };
  });
}

export interface RecentJoin {
  username: string;
  name: string;
  avatarUrl: string | null;
  entryFeeCents: number | null;
  createdAt: Date;
}

/** "Just happened" feed on the homepage — most recently submitted creators. */
export async function getRecentJoins(limit = 5): Promise<RecentJoin[]> {
  return db
    .select({
      username: creators.username,
      name: creators.name,
      avatarUrl: creators.avatarUrl,
      entryFeeCents: creators.entryFeeCents,
      createdAt: creators.createdAt,
    })
    .from(creators)
    .orderBy(desc(creators.createdAt))
    .limit(limit);
}
