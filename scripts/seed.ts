import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { creators } from "../src/lib/db/schema";

// Seed data only. Never run against a database with real creators.
const SEED_CREATORS = [
  { username: "mira_paints", name: "Mira Alston", category: "illustration", bio: "Gouache portraits of strangers on the subway." },
  { username: "kdev404", name: "Kenji Osei", category: "dev", bio: "Building a text editor that only I will ever use." },
  { username: "loosethread", name: "Priya Nandan", category: "music", bio: "Bedroom pop, one take, no autotune." },
  { username: "wrtwithsam", name: "Samuel Kirsch", category: "writing", bio: "Short fiction about people who miss their trains." },
  { username: "glyph.deb", name: "Deborah Ochoa", category: "design", bio: "Type foundry of one. Releases a typeface every solstice." },
  { username: "filmgrainjay", name: "Jay Whitfield", category: "photography", bio: "Shoots only on expired film. Refuses to explain why." },
  { username: "verse_null", name: "Aidan Cho", category: "comedy", bio: "Stand-up about being extremely online and extremely tired." },
  { username: "lo.fi.luz", name: "Luz Marino", category: "music", bio: "Makes lo-fi beats out of field recordings from her block." },
  { username: "stackofrenee", name: "Renee Vasquez", category: "dev", bio: "Open-source maintainer of a library eleven people use." },
  { username: "inkbyowen", name: "Owen Delacroix", category: "illustration", bio: "One-panel comics about bad dates." },
  { username: "thecutroom", name: "Farrah Ibsen", category: "film", bio: "Edits trailers for movies that don't exist yet." },
  { username: "noteform", name: "Tobias Reyes", category: "writing", bio: "Essays that started as tweets and got out of hand." },
  { username: "clay.and.co", name: "Coralie Nyugen", category: "design", bio: "Ceramics that look like they're mid-collapse. On purpose." },
  { username: "synth_moth", name: "Elias Vargas", category: "music", bio: "Modular synth, no lyrics, three EPs deep." },
  { username: "wideangle_bea", name: "Beatrix Solano", category: "photography", bio: "Documents empty parking lots at golden hour." },
  { username: "pxl_marlowe", name: "Marlowe Finch", category: "dev", bio: "Solo game dev. Six-year project, still unnamed." },
  { username: "punchlineparker", name: "Parker Ilic", category: "comedy", bio: "Sketch writer, mostly for an audience of his roommates." },
  { username: "brushfire_nia", name: "Nia Abara", category: "illustration", bio: "Paints protest signs after the protests are over." },
  { username: "midreel_theo", name: "Theo Lindqvist", category: "film", bio: "Micro-documentaries about people's junk drawers." },
  { username: "quietchords_ivy", name: "Ivy Castellano", category: "music", bio: "Folk covers of songs that were never folk to begin with." },
] as const;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Create .env.local before seeding.");
  }

  const connection = postgres(databaseUrl, { prepare: false });
  const db = drizzle(connection);

  console.log(`Seeding ${SEED_CREATORS.length} creators...`);

  await db
    .insert(creators)
    .values(
      SEED_CREATORS.map((creator) => ({
        ...creator,
        avatarUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${creator.username}`,
        links: { twitter: `https://twitter.com/${creator.username}` },
      })),
    )
    .onConflictDoNothing();

  console.log("Done.");
  await connection.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
