import type { PickResult } from "@/app/actions/battle";
import type { PublicCreator } from "@/lib/db/queries";

/**
 * The freshest Aura known for a creator on screen, in precedence order:
 * the result of the pick being shown right now, then any pick this session
 * already made, then the row the current pair was fetched with.
 *
 * All three are server figures — the first two come straight out of the vote
 * transaction. The row comes last because the next pair is prefetched, so it
 * can predate a pick the voter has already made, and the same face would come
 * back carrying the Aura it had before they picked it. See ISSUES.md
 * § 2026-09-12 "A picked creator came back with its old Aura".
 *
 * Type-only imports here, so this stays testable without dragging the server
 * action (and `server-only`) into a unit test.
 */
export function freshestAura(
  creator: Pick<PublicCreator, "id" | "aura">,
  result: PickResult | null,
  knownAura: Record<string, number>,
): number {
  if (result?.winnerId === creator.id) return result.winnerAura;
  if (result?.loserId === creator.id) return result.loserAura;
  return knownAura[creator.id] ?? creator.aura;
}
