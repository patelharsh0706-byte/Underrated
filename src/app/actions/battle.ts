"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { battles, creators } from "@/lib/db/schema";
import { getRandomPair, type PublicCreator } from "@/lib/db/queries";
import { computeEloUpdate } from "@/lib/ranking/elo";
import { getOrCreateVoterSession, readVoterSession } from "@/lib/session";

export async function nextBattle(): Promise<[PublicCreator, PublicCreator]> {
  // Read, don't create: the cookie is minted on the first actual pick.
  return getRandomPair(await readVoterSession());
}

const pickWinnerInput = z
  .object({
    winnerId: z.uuid(),
    loserId: z.uuid(),
  })
  .refine((data) => data.winnerId !== data.loserId, {
    message: "A creator cannot battle themselves",
  });

export interface PickResult {
  winnerId: string;
  loserId: string;
  winnerAura: number;
  loserAura: number;
  delta: number;
  /**
   * False when this session has already judged this pair. Aura is untouched
   * and nothing is written — see RANKING.md § Scoring. The UI must say so
   * rather than animate a delta that did not happen.
   */
  counted: boolean;
  /**
   * Picks recorded today, read inside the same transaction as the insert — so
   * it already includes this pick when `counted`, and is the plain current
   * count when it isn't. The arena's "today" counters are server-rendered
   * once and would otherwise sit frozen for the life of the page while the
   * voter keeps playing.
   */
  battlesToday: number;
}

/**
 * Records a pick and updates Aura for both creators in one transaction.
 * Ratings are read fresh from the database and row-locked — never trusted
 * from the client — so the result reflects the true state at vote time.
 *
 * A session gets one scoring pick per pair. A repeat of a matchup this session
 * has already answered is accepted and returned as `counted: false` without
 * writing anything — the voter keeps playing, the ranking ignores it.
 */
export async function pickWinner(input: z.infer<typeof pickWinnerInput>): Promise<PickResult> {
  const { winnerId, loserId } = pickWinnerInput.parse(input);
  const voterSession = await getOrCreateVoterSession();

  return db.transaction(async (tx) => {
    // Same UTC-day boundary getHomeStats() and getTop24h() use, so every
    // "today" number on the page resets at the same instant.
    const picksToday = async () => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(battles)
        .where(sql`${battles.createdAt} >= date_trunc('day', now() at time zone 'utc')`);
      return row.count;
    };

    // Lock both rows in one query, ordered by id, so two concurrent picks on
    // the same pair always acquire their locks in the same order. Locking
    // winner then loser separately let opposite-order picks on the same pair
    // deadlock/queue behind each other — see ISSUES.md § 2026-09-12.
    const rows = await tx
      .select()
      .from(creators)
      .where(inArray(creators.id, [winnerId, loserId]))
      .orderBy(creators.id)
      .for("update");
    const winner = rows.find((row) => row.id === winnerId);
    const loser = rows.find((row) => row.id === loserId);

    if (!winner || !loser) {
      throw new Error("One of the creators in this battle no longer exists");
    }
    if (!winner.isActive || !loser.isActive) {
      throw new Error("One of the creators in this battle is no longer active");
    }

    // One scoring pick per pair per session. The pair is unordered, so picking
    // the other side of a matchup already judged doesn't buy a second vote.
    // See RANKING.md § Scoring.
    const [alreadyJudged] = await tx
      .select({ id: battles.id })
      .from(battles)
      .where(
        and(
          eq(battles.voterSession, voterSession),
          sql`least(${battles.creatorAId}, ${battles.creatorBId}) = least(${winner.id}::uuid, ${loser.id}::uuid)`,
          sql`greatest(${battles.creatorAId}, ${battles.creatorBId}) = greatest(${winner.id}::uuid, ${loser.id}::uuid)`,
        ),
      )
      .limit(1);

    if (alreadyJudged) {
      return {
        winnerId: winner.id,
        loserId: loser.id,
        winnerAura: winner.aura,
        loserAura: loser.aura,
        delta: 0,
        counted: false,
        battlesToday: await picksToday(),
      };
    }

    const { delta, winnerAfter, loserAfter } = computeEloUpdate(winner.aura, loser.aura);

    await tx.insert(battles).values({
      creatorAId: winner.id,
      creatorBId: loser.id,
      winnerId: winner.id,
      voterSession,
      auraABefore: winner.aura,
      auraBBefore: loser.aura,
      auraAAfter: winnerAfter,
      auraBAfter: loserAfter,
    });

    await tx
      .update(creators)
      .set({
        aura: winnerAfter,
        battlesCount: sql`${creators.battlesCount} + 1`,
        winsCount: sql`${creators.winsCount} + 1`,
      })
      .where(eq(creators.id, winner.id));

    await tx
      .update(creators)
      .set({
        aura: loserAfter,
        battlesCount: sql`${creators.battlesCount} + 1`,
      })
      .where(eq(creators.id, loser.id));

    return {
      winnerId: winner.id,
      loserId: loser.id,
      winnerAura: winnerAfter,
      loserAura: loserAfter,
      delta,
      counted: true,
      battlesToday: await picksToday(),
    };
  });
}
