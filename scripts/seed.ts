import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { creators } from "../src/lib/db/schema";

type Socials = Record<string, string>;

// Seed data only. Never run against a database with real creators.
// workUrl is the strongest single piece of evidence for that creator's craft;
// socials are keyed by platform, and primarySocial picks which one shows on
// the battle card. followerCount is self-reported, shown pre-vote instead of
// Aura — see DATABASE.md.
const SEED_CREATORS: {
  username: string;
  name: string;
  category: string;
  bio: string;
  workUrl: string;
  socials: Socials;
  primarySocial: string;
  followerCount: number;
}[] = [
  {
    username: "mira_paints",
    name: "Mira Alston",
    category: "illustration",
    bio: "Gouache portraits of strangers on the subway.",
    workUrl: "https://miraalston.myportfolio.com",
    socials: { instagram: "https://instagram.com/mira_paints", twitter: "https://x.com/mira_paints" },
    primarySocial: "instagram",
    followerCount: 428,
  },
  {
    username: "kdev404",
    name: "Kenji Osei",
    category: "dev",
    bio: "Building a text editor that only I will ever use.",
    workUrl: "https://github.com/kdev404/inkwell",
    socials: { twitter: "https://x.com/kdev404", github: "https://github.com/kdev404" },
    primarySocial: "twitter",
    followerCount: 312,
  },
  {
    username: "loosethread",
    name: "Priya Nandan",
    category: "music",
    bio: "Bedroom pop, one take, no autotune.",
    workUrl: "https://open.spotify.com/artist/loosethread",
    socials: { spotify: "https://open.spotify.com/artist/loosethread", instagram: "https://instagram.com/loosethread" },
    primarySocial: "instagram",
    followerCount: 1200,
  },
  {
    username: "wrtwithsam",
    name: "Samuel Kirsch",
    category: "writing",
    bio: "Short fiction about people who miss their trains.",
    workUrl: "https://medium.com/@wrtwithsam/the-8-14-out-of-penn",
    socials: { twitter: "https://x.com/wrtwithsam" },
    primarySocial: "twitter",
    followerCount: 894,
  },
  {
    username: "glyph.deb",
    name: "Deborah Ochoa",
    category: "design",
    bio: "Type foundry of one. Releases a typeface every solstice.",
    workUrl: "https://glyphdeb.type.foundry",
    socials: { instagram: "https://instagram.com/glyph.deb", twitter: "https://x.com/glyphdeb" },
    primarySocial: "instagram",
    followerCount: 2300,
  },
  {
    username: "filmgrainjay",
    name: "Jay Whitfield",
    category: "photography",
    bio: "Shoots only on expired film. Refuses to explain why.",
    workUrl: "https://filmgrainjay.com",
    socials: { instagram: "https://instagram.com/filmgrainjay" },
    primarySocial: "instagram",
    followerCount: 5600,
  },
  {
    username: "verse_null",
    name: "Aidan Cho",
    category: "comedy",
    bio: "Stand-up about being extremely online and extremely tired.",
    workUrl: "https://youtube.com/watch?v=verse-null-set-3",
    socials: { youtube: "https://youtube.com/@verse_null", twitter: "https://x.com/verse_null" },
    primarySocial: "youtube",
    followerCount: 3100,
  },
  {
    username: "lo.fi.luz",
    name: "Luz Marino",
    category: "music",
    bio: "Makes lo-fi beats out of field recordings from her block.",
    workUrl: "https://open.spotify.com/artist/lofiluz",
    socials: { spotify: "https://open.spotify.com/artist/lofiluz", tiktok: "https://tiktok.com/@lo.fi.luz" },
    primarySocial: "tiktok",
    followerCount: 780,
  },
  {
    username: "stackofrenee",
    name: "Renee Vasquez",
    category: "dev",
    bio: "Open-source maintainer of a library eleven people use.",
    workUrl: "https://github.com/stackofrenee/beacon",
    socials: { github: "https://github.com/stackofrenee", twitter: "https://x.com/stackofrenee" },
    primarySocial: "twitter",
    followerCount: 156,
  },
  {
    username: "inkbyowen",
    name: "Owen Delacroix",
    category: "illustration",
    bio: "One-panel comics about bad dates.",
    workUrl: "https://instagram.com/inkbyowen",
    socials: { instagram: "https://instagram.com/inkbyowen" },
    primarySocial: "instagram",
    followerCount: 9400,
  },
  {
    username: "thecutroom",
    name: "Farrah Ibsen",
    category: "film",
    bio: "Edits trailers for movies that don't exist yet.",
    workUrl: "https://vimeo.com/thecutroom",
    socials: { instagram: "https://instagram.com/thecutroom" },
    primarySocial: "instagram",
    followerCount: 640,
  },
  {
    username: "noteform",
    name: "Tobias Reyes",
    category: "writing",
    bio: "Essays that started as tweets and got out of hand.",
    workUrl: "https://noteform.substack.com",
    socials: { twitter: "https://x.com/noteform" },
    primarySocial: "twitter",
    followerCount: 2100,
  },
  {
    username: "clay.and.co",
    name: "Coralie Nyugen",
    category: "design",
    bio: "Ceramics that look like they're mid-collapse. On purpose.",
    workUrl: "https://clayandco.shop",
    socials: { instagram: "https://instagram.com/clay.and.co" },
    primarySocial: "instagram",
    followerCount: 3800,
  },
  {
    username: "synth_moth",
    name: "Elias Vargas",
    category: "music",
    bio: "Modular synth, no lyrics, three EPs deep.",
    workUrl: "https://open.spotify.com/artist/synthmoth",
    socials: { spotify: "https://open.spotify.com/artist/synthmoth", instagram: "https://instagram.com/synth_moth" },
    primarySocial: "spotify",
    followerCount: 510,
  },
  {
    username: "wideangle_bea",
    name: "Beatrix Solano",
    category: "photography",
    bio: "Documents empty parking lots at golden hour.",
    workUrl: "https://wideanglebea.com",
    socials: { instagram: "https://instagram.com/wideangle_bea" },
    primarySocial: "instagram",
    followerCount: 1900,
  },
  {
    username: "pxl_marlowe",
    name: "Marlowe Finch",
    category: "dev",
    bio: "Solo game dev. Six-year project, still unnamed.",
    workUrl: "https://pxlmarlowe.itch.io",
    socials: { twitter: "https://x.com/pxl_marlowe", linkedin: "https://linkedin.com/in/marlowefinch" },
    primarySocial: "twitter",
    followerCount: 1524,
  },
  {
    username: "punchlineparker",
    name: "Parker Ilic",
    category: "comedy",
    bio: "Sketch writer, mostly for an audience of his roommates.",
    workUrl: "https://youtube.com/watch?v=punchline-sketch-04",
    socials: { twitter: "https://x.com/punchlineparker" },
    primarySocial: "twitter",
    followerCount: 267,
  },
  {
    username: "brushfire_nia",
    name: "Nia Abara",
    category: "illustration",
    bio: "Paints protest signs after the protests are over.",
    workUrl: "https://niaabara.myportfolio.com",
    socials: { instagram: "https://instagram.com/brushfire_nia" },
    primarySocial: "instagram",
    followerCount: 7200,
  },
  {
    username: "midreel_theo",
    name: "Theo Lindqvist",
    category: "film",
    bio: "Micro-documentaries about people's junk drawers.",
    workUrl: "https://youtube.com/@midreel_theo",
    socials: { youtube: "https://youtube.com/@midreel_theo" },
    primarySocial: "youtube",
    followerCount: 4300,
  },
  {
    username: "quietchords_ivy",
    name: "Ivy Castellano",
    category: "music",
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
