import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { creators } from "../src/lib/db/schema";
import { type Category } from "../src/lib/creator-schema";

type Socials = Record<string, string>;

// Seed data only. Never run against a database with real creators — this was
// run against production once, and three fictional people sat on the live
// leaderboard for weeks carrying categories no filter could match. They are
// deactivated now; see ISSUES.md § 2026-09-14.
//
// `category` is typed as Category, so the three V1 values in creator-schema.ts
// are the only ones this file can produce. These creators predate that
// taxonomy (they were illustrators, musicians, photographers), so the mapping
// below is approximate by nature — they are fictional, and the point is that
// local data can always be filtered.
// workUrl is the strongest single piece of evidence for that creator's craft;
// socials are keyed by platform, and primarySocial picks which one shows on
// the battle card. followerCount is self-reported, shown pre-vote instead of
// Aura — see DATABASE.md.
const SEED_CREATORS: {
  username: string;
  name: string;
  category: Category;
  bio: string;
  workUrl: string;
  socials: Socials;
  primarySocial: string;
  followerCount: number;
}[] = [
  {
    username: "mira_paints",
    name: "Mira Alston",
    category: "Builder",
    bio: "Gouache portraits of strangers on the subway.",
    workUrl: "https://miraalston.myportfolio.com",
    socials: { instagram: "https://instagram.com/mira_paints", twitter: "https://x.com/mira_paints" },
    primarySocial: "instagram",
    followerCount: 428,
  },
  {
    username: "kdev404",
    name: "Kenji Osei",
    category: "Indie Developer",
    bio: "Building a text editor that only I will ever use.",
    workUrl: "https://github.com/kdev404/inkwell",
    socials: { twitter: "https://x.com/kdev404", github: "https://github.com/kdev404" },
    primarySocial: "twitter",
    followerCount: 312,
  },
  {
    username: "loosethread",
    name: "Priya Nandan",
    category: "Builder",
    bio: "Bedroom pop, one take, no autotune.",
    workUrl: "https://open.spotify.com/artist/loosethread",
    socials: { spotify: "https://open.spotify.com/artist/loosethread", instagram: "https://instagram.com/loosethread" },
    primarySocial: "instagram",
    followerCount: 1200,
  },
  {
    username: "wrtwithsam",
    name: "Samuel Kirsch",
    category: "Builder",
    bio: "Short fiction about people who miss their trains.",
    workUrl: "https://medium.com/@wrtwithsam/the-8-14-out-of-penn",
    socials: { twitter: "https://x.com/wrtwithsam" },
    primarySocial: "twitter",
    followerCount: 894,
  },
  {
    username: "glyph.deb",
    name: "Deborah Ochoa",
    category: "Builder",
    bio: "Type foundry of one. Releases a typeface every solstice.",
    workUrl: "https://glyphdeb.type.foundry",
    socials: { instagram: "https://instagram.com/glyph.deb", twitter: "https://x.com/glyphdeb" },
    primarySocial: "instagram",
    followerCount: 2300,
  },
  {
    username: "filmgrainjay",
    name: "Jay Whitfield",
    category: "Builder",
    bio: "Shoots only on expired film. Refuses to explain why.",
    workUrl: "https://filmgrainjay.com",
    socials: { instagram: "https://instagram.com/filmgrainjay" },
    primarySocial: "instagram",
    followerCount: 5600,
  },
  {
    username: "verse_null",
    name: "Aidan Cho",
    category: "Builder",
    bio: "Stand-up about being extremely online and extremely tired.",
    workUrl: "https://youtube.com/watch?v=verse-null-set-3",
    socials: { youtube: "https://youtube.com/@verse_null", twitter: "https://x.com/verse_null" },
    primarySocial: "youtube",
    followerCount: 3100,
  },
  {
    username: "lo.fi.luz",
    name: "Luz Marino",
    category: "Builder",
    bio: "Makes lo-fi beats out of field recordings from her block.",
    workUrl: "https://open.spotify.com/artist/lofiluz",
    socials: { spotify: "https://open.spotify.com/artist/lofiluz", tiktok: "https://tiktok.com/@lo.fi.luz" },
    primarySocial: "tiktok",
    followerCount: 780,
  },
  {
    username: "stackofrenee",
    name: "Renee Vasquez",
    category: "Indie Developer",
    bio: "Open-source maintainer of a library eleven people use.",
    workUrl: "https://github.com/stackofrenee/beacon",
    socials: { github: "https://github.com/stackofrenee", twitter: "https://x.com/stackofrenee" },
    primarySocial: "twitter",
    followerCount: 156,
  },
  {
    username: "inkbyowen",
    name: "Owen Delacroix",
    category: "Builder",
    bio: "One-panel comics about bad dates.",
    workUrl: "https://instagram.com/inkbyowen",
    socials: { instagram: "https://instagram.com/inkbyowen" },
    primarySocial: "instagram",
    followerCount: 9400,
  },
  {
    username: "thecutroom",
    name: "Farrah Ibsen",
    category: "Builder",
    bio: "Edits trailers for movies that don't exist yet.",
    workUrl: "https://vimeo.com/thecutroom",
    socials: { instagram: "https://instagram.com/thecutroom" },
    primarySocial: "instagram",
    followerCount: 640,
  },
  {
    username: "noteform",
    name: "Tobias Reyes",
    category: "Builder",
    bio: "Essays that started as tweets and got out of hand.",
    workUrl: "https://noteform.substack.com",
    socials: { twitter: "https://x.com/noteform" },
    primarySocial: "twitter",
    followerCount: 2100,
  },
  {
    username: "clay.and.co",
    name: "Coralie Nyugen",
    category: "Builder",
    bio: "Ceramics that look like they're mid-collapse. On purpose.",
    workUrl: "https://clayandco.shop",
    socials: { instagram: "https://instagram.com/clay.and.co" },
    primarySocial: "instagram",
    followerCount: 3800,
  },
  {
    username: "synth_moth",
    name: "Elias Vargas",
    category: "Builder",
    bio: "Modular synth, no lyrics, three EPs deep.",
    workUrl: "https://open.spotify.com/artist/synthmoth",
    socials: { spotify: "https://open.spotify.com/artist/synthmoth", instagram: "https://instagram.com/synth_moth" },
    primarySocial: "spotify",
    followerCount: 510,
  },
  {
    username: "wideangle_bea",
    name: "Beatrix Solano",
    category: "Builder",
    bio: "Documents empty parking lots at golden hour.",
    workUrl: "https://wideanglebea.com",
    socials: { instagram: "https://instagram.com/wideangle_bea" },
    primarySocial: "instagram",
    followerCount: 1900,
  },
  {
    username: "pxl_marlowe",
    name: "Marlowe Finch",
    category: "Indie Developer",
    bio: "Solo game dev. Six-year project, still unnamed.",
    workUrl: "https://pxlmarlowe.itch.io",
    socials: { twitter: "https://x.com/pxl_marlowe", linkedin: "https://linkedin.com/in/marlowefinch" },
    primarySocial: "twitter",
    followerCount: 1524,
  },
  {
    username: "punchlineparker",
    name: "Parker Ilic",
    category: "Builder",
    bio: "Sketch writer, mostly for an audience of his roommates.",
    workUrl: "https://youtube.com/watch?v=punchline-sketch-04",
    socials: { twitter: "https://x.com/punchlineparker" },
    primarySocial: "twitter",
    followerCount: 267,
  },
  {
    username: "brushfire_nia",
    name: "Nia Abara",
    category: "Builder",
    bio: "Paints protest signs after the protests are over.",
    workUrl: "https://niaabara.myportfolio.com",
    socials: { instagram: "https://instagram.com/brushfire_nia" },
    primarySocial: "instagram",
    followerCount: 7200,
  },
  {
    username: "midreel_theo",
    name: "Theo Lindqvist",
    category: "Builder",
    bio: "Micro-documentaries about people's junk drawers.",
    workUrl: "https://youtube.com/@midreel_theo",
    socials: { youtube: "https://youtube.com/@midreel_theo" },
    primarySocial: "youtube",
    followerCount: 4300,
  },
  {
    username: "quietchords_ivy",
    name: "Ivy Castellano",
    category: "Builder",
    bio: "Folk covers of songs that were never folk to begin with.",
    workUrl: "https://open.spotify.com/artist/quietchordsivy",
    socials: { spotify: "https://open.spotify.com/artist/quietchordsivy", youtube: "https://youtube.com/@quietchords_ivy" },
    primarySocial: "spotify",
    followerCount: 990,
  },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Create .env.local before seeding.");
  }

  const connection = postgres(databaseUrl, { prepare: false });
  const db = drizzle(connection);

  console.log(`Seeding ${SEED_CREATORS.length} creators...`);

  for (const creator of SEED_CREATORS) {
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${creator.username}`;

    await db
      .insert(creators)
      .values({ ...creator, avatarUrl })
      .onConflictDoUpdate({
        target: creators.username,
        set: {
          workUrl: creator.workUrl,
          socials: creator.socials,
          primarySocial: creator.primarySocial,
          followerCount: creator.followerCount,
        },
      });
  }

  console.log("Done.");
  await connection.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
