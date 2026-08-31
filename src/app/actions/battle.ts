"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { battles, creators } from "@/lib/db/schema";
import { getRandomPair, type PublicCreator } from "@/lib/db/queries";
import { computeEloUpdate } from "@/lib/ranking/elo";
import { getOrCreateVoterSession } from "@/lib/session";

export async function nextBattle(): Promise<[PublicCreator, PublicCreator]> {
  return getRandomPair();
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
}

/**
 * Records a pick and updates Aura for both creators in one transaction.
 * Ratings are read fresh from the database and row-locked — never trusted
 * from the client — so the result reflects the true state at vote time.
 */
export async function pickWinner(input: z.infer<typeof pickWinnerInput>): Promise<PickResult> {
  const { winnerId, loserId } = pickWinnerInput.parse(input);
  const voterSession = await getOrCreateVoterSession();

  return db.transaction(async (tx) => {
    const [winner] = await tx
      .select()
      .from(creators)
      .where(eq(creators.id, winnerId))
      .for("update");
    const [loser] = await tx
      .select()
      .from(creators)
      .where(eq(creators.id, loserId))
      .for("update");

    if (!winner || !loser) {
      throw new Error("One of the creators in this battle no longer exists");
    }
    if (!winner.isActive || !loser.isActive) {
      throw new Error("One of the creators in this battle is no longer active");
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
    };
  });
}
