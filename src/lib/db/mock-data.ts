/**
 * TEMPORARY — local preview fixtures, not real data.
 *
 * Lets the homepage / leaderboard / profile routes render instantly without
 * hitting Supabase, for viewing the V2 frontend while the database is slow
 * or unreachable. Gated behind PREVIEW_MOCK=1 (see isMockMode below) — off
 * by default, never touches production. Safe to delete this file and its
 * call sites once it's no longer needed; nothing else in the app imports it:
 *   pages    — src/app/page.tsx, src/app/leaderboard/page.tsx,
 *              src/app/c/[username]/page.tsx, src/app/submit/success/page.tsx
 *   actions  — src/app/actions/battle.ts (nextBattle, pickWinner),
 *              src/app/actions/stats.ts (pingVisitor), src/app/actions/spot.ts
 * The actions are gated too because the battle loop and the 45 s heartbeat
 * fire on every click; without those gates a mock page still hangs on the
 * real database the moment you pick someone.
 */
import type { PickResult } from "@/app/actions/battle";
import { computeEloUpdate } from "@/lib/ranking/elo";
import type {
  ActiveSponsorship,
  CreatorProfile,
  DailyHeatEntry,
  HomeStats,
  LeaderboardEntry,
  PublicCreator,
  RecentBattleResult,
  RecentJoin,
} from "@/lib/db/queries";

export function isMockMode(): boolean {
  // VERCEL_ENV, not NODE_ENV: a local `next build && next start` also sets
  // NODE_ENV=production, and that stays a legitimate way to test mock mode
  // against a production build. VERCEL_ENV is Vercel's own signal for an
  // actual deployment, so this refuses to activate only there — a stray
  // PREVIEW_MOCK=1 in the Vercel production env can't silently swap the live
  // game for fixtures and swallow every real pick.
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.PREVIEW_MOCK === "1";
}

function avatar(seed: string): string {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

// The three real category values (see src/components/submit/enter-arena-flow.tsx).
type Category = "Indie Developer" | "Builder" | "CEO/Founder";

interface Seed {
  username: string;
  name: string;
  bio: string;
  category: Category;
  aura: number;
  battlesCount: number;
  voterCount: number;
  winsCount: number;
  followerCount: number;
  workUrl: string;
  primarySocial: string;
  socials: Record<string, string>;
}

const SEEDS: Seed[] = [
  {
    username: "lunaparks",
    name: "Luna Park",
    bio: "Gouache portraits of strangers on the subway.",
    category: "Indie Developer",
    aura: 1712,
    battlesCount: 41,
    voterCount: 22,
    winsCount: 27,
    followerCount: 3120,
    workUrl: "https://lunapark.art",
    primarySocial: "twitter",
    socials: {
      twitter: "https://x.com/lunaparks",
      instagram: "https://instagram.com/lunaparks",
    },
  },
  {
    username: "devonrails",
    name: "Devon Reyes",
    bio: "Building tiny tools for a calmer internet.",
    category: "Builder",
    aura: 1654,
    battlesCount: 38,
    voterCount: 19,
    winsCount: 21,
    followerCount: 890,
    workUrl: "https://calmtools.dev",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/devonrails" },
  },
  {
    username: "sanabuilds",
    name: "Sana Iqbal",
    bio: "Bootstrapped to 900 paying users, no funding.",
    category: "CEO/Founder",
    aura: 1598,
    battlesCount: 35,
    voterCount: 17,
    winsCount: 19,
    followerCount: 2410,
    workUrl: "https://ledgerly.io",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/sanabuilds" },
  },
  {
    username: "kenjimakes",
    name: "Kenji Osei",
    bio: "Building a text editor that only he will ever use.",
    category: "Indie Developer",
    aura: 1541,
    battlesCount: 29,
    voterCount: 15,
    winsCount: 15,
    followerCount: 410,
    workUrl: "https://github.com/kenjimakes/inkwell",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/kenjimakes" },
  },
  {
    username: "priyanandan",
    name: "Priya Nandan",
    bio: "Bedroom pop, one take, no autotune.",
    category: "Builder",
    aura: 1487,
    battlesCount: 26,
    voterCount: 14,
    winsCount: 13,
    followerCount: 5600,
    workUrl: "https://priyanandan.bandcamp.com",
    primarySocial: "instagram",
    socials: { instagram: "https://instagram.com/priyanandan" },
  },
  {
    username: "romanfeld",
    name: "Roman Feldman",
    bio: "Full-stack builder, 23, three failed startups so far.",
    category: "CEO/Founder",
    aura: 1433,
    battlesCount: 24,
    voterCount: 12,
    winsCount: 11,
    followerCount: 780,
    workUrl: "https://tryshipfast.com",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/romanfeld" },
  },
  {
    username: "adeelkhan",
    name: "Adeel Khan",
    bio: "Makes mobile apps, overthinks tiny details.",
    category: "Indie Developer",
    aura: 1378,
    battlesCount: 20,
    voterCount: 10,
    winsCount: 9,
    followerCount: 320,
    workUrl: "https://adeel.app",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/adeelkhan" },
  },
  {
    username: "clairefoy",
    name: "Claire Foy",
    bio: "Your favorite builder's hype woman.",
    category: "Builder",
    aura: 1301,
    battlesCount: 16,
    voterCount: 8,
    winsCount: 6,
    followerCount: 190,
    workUrl: "https://buildhop.io",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/clairefoy" },
  },
  {
    username: "ninablack",
    name: "Nina Black",
    bio: "Helping founders launch products on X.",
    category: "CEO/Founder",
    aura: 1245,
    battlesCount: 11,
    voterCount: 4,
    winsCount: 4,
    followerCount: 95,
    workUrl: "https://ninablack.co",
    primarySocial: "twitter",
    socials: { twitter: "https://x.com/ninablack" },
  },
];

function toPublic(seed: Seed, id: number): PublicCreator {
  return {
    id: `mock-${id}`,
    username: seed.username,
    name: seed.name,
    avatarUrl: avatar(seed.username),
    bio: seed.bio,
    category: seed.category,
    aura: seed.aura,
    battlesCount: seed.battlesCount,
    voterCount: seed.voterCount,
    workUrl: seed.workUrl,
    socials: seed.socials,
    primarySocial: seed.primarySocial,
    followerCount: seed.followerCount,
  };
}

const CREATORS: PublicCreator[] = SEEDS.map(toPublic);

export function mockRandomPair(): [PublicCreator, PublicCreator] {
  // Two distinct creators, drawn fresh each time — a fixed pair made every
  // "next battle" the same two faces, which hid the loop's own behaviour.
  const a = Math.floor(Math.random() * CREATORS.length);
  let b = Math.floor(Math.random() * (CREATORS.length - 1));
  if (b >= a) b += 1;
  return [CREATORS[a], CREATORS[b]];
}

/**
 * A pick against the fixtures. Runs the real Elo on the mock Aura so the
 * delta badge and count-up look like production; nothing is stored, so a
 * repeat pick "counts" again and Aura never persists between battles.
 */
export function mockPickResult(winnerId: string, loserId: string): PickResult {
  const winner = CREATORS.find((c) => c.id === winnerId);
  const loser = CREATORS.find((c) => c.id === loserId);
  if (!winner || !loser) {
    throw new Error("Mock pick for a creator that is not in the fixtures");
  }
  const { delta, winnerAfter, loserAfter } = computeEloUpdate(winner.aura, loser.aura);
  return {
    winnerId,
    loserId,
    winnerAura: winnerAfter,
    loserAura: loserAfter,
    delta,
    counted: true,
    battlesToday: mockHomeStats().battlesToday + 1,
  };
}

export function mockLeaderboard(limit = 50): LeaderboardEntry[] {
  return [...CREATORS]
    .sort((a, b) => b.aura - a.aura)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
    .slice(0, limit);
}

export function mockTop24h(): DailyHeatEntry[] {
  // A different order than all-time Aura on purpose — matches the real
  // getTop24h()/getLeaderboard() split, where Daily Heat and Aura rank
  // creators differently, which is exactly why Main Character (Daily
  // Heat #1) isn't always the same person as the Aura leaderboard's #1.
  const order = [2, 0, 4, 1, 3, 6, 5, 7, 8];
  // Realistic magnitudes: Daily Heat is a win-loss differential (single
  // digits) and aura change is a handful of ~16-32pt swings, not hundreds.
  const heat = [6, 5, 3, 2, 1, 0, -1, -3, -4];
  const auraChange = [74, 48, 31, 12, -9, 0, -18, -37, -52];
  return order.map((idx, i) => ({
    ...CREATORS[idx],
    rank: i + 1,
    dailyHeat: heat[i],
    battlesToday: 12 - i,
    auraChangeToday: auraChange[i],
  }));
}

export function mockCreatorProfile(username: string): CreatorProfile | null {
  const seedIndex = SEEDS.findIndex((s) => s.username === username);
  if (seedIndex === -1) return null;
  const base = toPublic(SEEDS[seedIndex], seedIndex);
  const ranked = mockLeaderboard();
  const rankRow = ranked.find((r) => r.id === base.id);
  return {
    ...base,
    rank: seedIndex < 6 ? (rankRow?.rank ?? null) : null,
    battlesCount: base.battlesCount,
    winsCount: SEEDS[seedIndex].winsCount,
  };
}

export function mockHomeStats(): HomeStats {
  return {
    visitorsSoFar: 1842,
    battlesSoFar: 973,
    battlesToday: 47,
    creatorsInArena: CREATORS.length,
    paidForBattlesCents: CREATORS.length * 300,
    siteVisits: 2601,
    onlineNow: 6,
    peopleDeciding: 214,
  };
}

export function mockRecentJoins(): RecentJoin[] {
  const now = Date.now();
  return SEEDS.slice(0, 5).map((seed, i) => ({
    username: seed.username,
    name: seed.name,
    entryFeeCents: 300,
    createdAt: new Date(now - (i + 1) * 1000 * 60 * 60 * 6),
  }));
}

export function mockRecentBattleResults(): RecentBattleResult[] {
  const now = Date.now();
  const pairs: [number, number][] = [
    [0, 3],
    [1, 4],
    [2, 5],
    [6, 0],
    [7, 1],
  ];
  // One milestone in the set, so the ⚡ row shows up in preview — real
  // milestones are rare, which is the point of calling them out.
  const milestones = [1600, null, null, null, null];
  return pairs.map(([winnerIdx, loserIdx], i) => ({
    winnerName: SEEDS[winnerIdx].name,
    winnerUsername: SEEDS[winnerIdx].username,
    loserName: SEEDS[loserIdx].name,
    loserUsername: SEEDS[loserIdx].username,
    createdAt: new Date(now - (i + 1) * 1000 * 60 * 20),
    auraMilestone: milestones[i],
  }));
}

export function mockActiveSponsorship(): ActiveSponsorship {
  return {
    sponsorName: "Ledgerly",
    imageUrl: null,
    description: "Invoicing for people who hate invoicing.",
    targetUrl: "https://ledgerly.io",
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
  };
}

/**
 * A creator who just paid and has not battled yet — what /submit/success
 * renders. Deliberately zeroed rather than reusing a seeded row: the welcome
 * screen is entirely about the not-yet-placed state.
 */
export function mockNewCreator(): CreatorProfile {
  return {
    id: "mock-new",
    username: "harshpatel502",
    name: "Harsh Patel",
    avatarUrl: avatar("harshpatel502"),
    bio: "I help talented people find their place. Through underhyped.wtf",
    category: "Indie Developer",
    aura: 1500,
    battlesCount: 0,
    voterCount: 0,
    winsCount: 0,
    workUrl: "https://underhyped.wtf",
    socials: { twitter: "https://x.com/harshpatel502" },
    primarySocial: "twitter",
    followerCount: null,
    rank: null,
  };
}
