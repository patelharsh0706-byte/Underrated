// "⚔ N battles ▾" on the profile opens recent battles — wins and upward Aura
// milestones only (DECISIONS.md § 2026-10-04 "Onboarding from X and profile v2").
// Pure, so it's tested without a database.

import { formatTimeAgo } from "@/lib/time-ago";

export interface BattleForActivity {
  creatorAId: string;
  creatorBId: string;
  winnerId: string;
  auraABefore: number;
  auraAAfter: number;
  auraBBefore: number;
  auraBAfter: number;
  opponentName: string;
  createdAt: Date;
}

export interface ActivityItem {
  icon: "⚔️" | "🔥";
  text: string;
  when: string;
}

/** Newest first, at most `max`: "Beat X" for wins, "Crossed N Aura" for each 100 crossed upward. */
export function deriveActivity(creatorId: string, battles: BattleForActivity[], now = Date.now(), max = 5): ActivityItem[] {
  const items: (ActivityItem & { at: number })[] = [];
  for (const b of battles) {
    const isA = b.creatorAId === creatorId;
    const before = isA ? b.auraABefore : b.auraBBefore;
    const after = isA ? b.auraAAfter : b.auraBAfter;
    const at = b.createdAt.getTime();
    const when = formatTimeAgo(b.createdAt, now).replace(/ ago$/, "");
    if (b.winnerId === creatorId) items.push({ icon: "⚔️", text: `Beat ${b.opponentName}`, when, at: at - 1 });
    if (Math.floor(after / 100) > Math.floor(before / 100)) {
      items.push({ icon: "🔥", text: `Crossed ${(Math.floor(after / 100) * 100).toLocaleString("en-US")} Aura`, when, at });
    }
  }
  return items
    .sort((x, y) => y.at - x.at)
    .slice(0, max)
    .map(({ icon, text, when }) => ({ icon, text, when }));
}
