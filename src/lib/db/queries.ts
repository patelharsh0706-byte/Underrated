import "server-only";

import { sql } from "drizzle-orm";

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
