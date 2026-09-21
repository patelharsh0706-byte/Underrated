import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

const authSchema = pgSchema("auth");

// Reference only — owned and managed by Supabase Auth. Never migrated by us.
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const creators = pgTable(
  "creators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => authUsers.id),
    username: text("username").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    category: text("category"),
    workUrl: text("work_url"),
    socials: jsonb("socials"),
    primarySocial: text("primary_social"),
    followerCount: integer("follower_count"),
    entryFeeCents: integer("entry_fee_cents"),
    dodoPaymentId: text("dodo_payment_id"),
    aura: integer("aura").notNull().default(1500),
    battlesCount: integer("battles_count").notNull().default(0),
    winsCount: integer("wins_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("creators_username_key").on(table.username),
    uniqueIndex("creators_user_id_key").on(table.userId),
    uniqueIndex("creators_dodo_payment_key").on(table.dodoPaymentId),
    index("creators_aura_idx").on(table.aura.desc()),
    index("creators_is_active_idx").on(table.isActive),
  ],
);

export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorAId: uuid("creator_a_id")
      .notNull()
      .references(() => creators.id),
    creatorBId: uuid("creator_b_id")
      .notNull()
      .references(() => creators.id),
    winnerId: uuid("winner_id")
      .notNull()
      .references(() => creators.id),
    voterSession: text("voter_session").notNull(),
    auraABefore: integer("aura_a_before").notNull(),
    auraBBefore: integer("aura_b_before").notNull(),
    auraAAfter: integer("aura_a_after").notNull(),
    auraBAfter: integer("aura_b_after").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("battles_created_at_idx").on(table.createdAt),
    index("battles_winner_created_at_idx").on(table.winnerId, table.createdAt),
    check("battles_distinct_creators", sql`${table.creatorAId} != ${table.creatorBId}`),
    check(
      "battles_winner_is_participant",
      sql`${table.winnerId} = ${table.creatorAId} or ${table.winnerId} = ${table.creatorBId}`,
    ),
  ],
);

export const visitorPings = pgTable(
  "visitor_pings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voterSession: text("voter_session").notNull(),
    firstSeenAt: timestamptz("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
    visitCount: integer("visit_count").notNull().default(1),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("visitor_pings_voter_session_key").on(table.voterSession),
    index("visitor_pings_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const sponsorships = pgTable(
  "sponsorships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sponsorName: text("sponsor_name").notNull(),
    // Null means "no logo" — a deliberate sponsor choice, rendered as a
    // monogram everywhere the logo appears. Not the same as "not fetched yet".
    imageUrl: text("image_url"),
    description: text("description"),
    targetUrl: text("target_url").notNull(),
    startAt: timestamptz("start_at").notNull(),
    endAt: timestamptz("end_at").notNull(),
    dodoPaymentId: text("dodo_payment_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sponsorships_start_end_idx").on(table.startAt, table.endAt),
    uniqueIndex("sponsorships_dodo_payment_key").on(table.dodoPaymentId),
  ],
);

// Receipts: Picker identity markers. One spot per user per creator.
// RLS enabled, no policies (server-only via service role, like visitor_pings).
export const spots = pgTable(
  "spots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    rankAtSpot: integer("rank_at_spot"), // null if creator in placement
    auraAtSpot: integer("aura_at_spot").notNull(), // immutable snapshot
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("spots_user_creator_key").on(table.userId, table.creatorId),
    index("spots_user_id_idx").on(table.userId),
    index("spots_creator_id_idx").on(table.creatorId),
  ],
);

// Receipts: A picker's public identity. Keyed by auth.users.id — DATABASE.md
// says never extend auth.users, add a public.profiles table instead.
// The username is derived from the Google email on first sign-in and is what
// /[username]/receipts resolves against, so it is unique and immutable-ish
// (editing is a later feature; the column is here so it can be).
// RLS enabled, no policies (server-only via service role, like visitor_pings).
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    // The login email, so the owner can see which account a profile belongs
    // to in the dashboard. Written once, backfilled by 0010, never rendered:
    // the public receipts route reads a projection without it — see
    // getPublicProfileByUsername and DATABASE.md § profiles.
    email: text("email"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_username_key").on(table.username)],
);

// Receipts: Session-to-identity linker. One row per voter session linked to a user.
// RLS enabled, no policies (server-only via service role, like visitor_pings).
// First link wins: ON CONFLICT DO NOTHING.
export const pickerSessions = pgTable(
  "picker_sessions",
  {
    voterSession: text("voter_session").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id),
    linkedAt: timestamptz("linked_at").notNull().defaultNow(),
  },
  (table) => [index("picker_sessions_user_id_idx").on(table.userId)],
);
