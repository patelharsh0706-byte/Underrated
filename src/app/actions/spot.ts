"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  spotCreator as dbSpotCreator,
  getSpottedIds,
  getMySpot,
} from "@/lib/db/queries";
import { readVoterSession } from "@/lib/session";
import { isMockMode } from "@/lib/db/mock-data";
import { db } from "@/lib/db";
import { creators } from "@/lib/db/schema";

const SpotCreatorInput = z.object({
  creatorId: z.string().uuid("Invalid creator ID"),
});

export type SpotCreatorInput = z.infer<typeof SpotCreatorInput>;

export interface SpotResult {
  ok: boolean;
  reason?: "auth" | "unavailable" | "already_spotted";
  rankAtSpot?: number | null;
  alreadySpotted?: boolean;
}

export async function spotCreator(input: SpotCreatorInput): Promise<SpotResult> {
  try {
    // Validate input
    const { creatorId } = SpotCreatorInput.parse(input);

    // Mock mode
    if (isMockMode()) {
      return { ok: false, reason: "unavailable" };
    }

    // Get user ID
    const userId = await getUserId();
    if (!userId) {
      return { ok: false, reason: "auth" };
    }

    // Get creator (verify exists and is active)
    const creator = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);
    if (creator.length === 0 || !creator[0].isActive) {
      return { ok: false, reason: "unavailable" };
    }

    const c = creator[0];
    // Compute rank at spot time (creator is ranked if battles_count >= 10)
    const isRanked = c.battlesCount >= 10;
    const rankAtSpot = isRanked ? computeRankForAura(c.aura) : null;

    // Insert spot (ON CONFLICT DO NOTHING)
    const result = await dbSpotCreator({
      userId,
      creatorId,
      rankAtSpot,
      auraAtSpot: c.aura,
    });

    // Link voter session if exists
    const voterSession = await readVoterSession();
    if (voterSession) {
      const { linkPickerSession } = await import("@/lib/db/queries");
      await linkPickerSession(voterSession, userId);
    }

    return {
      ok: true,
      rankAtSpot,
      alreadySpotted: result.alreadySpotted,
    };
  } catch (error) {
    console.error("Spot creator error:", error);
    return { ok: false, reason: "unavailable" };
  }
}

export async function getMySpotAction(creatorId: string) {
  const userId = await getUserId();
  if (!userId) return null;

  return getMySpot(userId, creatorId);
}

// Compute rank from aura (copied from ranking logic)
function computeRankForAura(aura: number): number {
  // Placeholder: actual logic from RANKING.md
  return Math.max(1, Math.floor(aura / 100));
}
