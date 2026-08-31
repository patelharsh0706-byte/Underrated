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
    aura: integer("aura").notNull().default(1500),
    battlesCount: integer("battles_count").notNull().default(0),
    winsCount: integer("wins_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("creators_username_key").on(table.username),
    uniqueIndex("creators_user_id_key").on(table.userId),
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

export const sponsorships = pgTable(
  "sponsorships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sponsorName: text("sponsor_name").notNull(),
    imageUrl: text("image_url").notNull(),
    targetUrl: text("target_url").notNull(),
    startAt: timestamptz("start_at").notNull(),
    endAt: timestamptz("end_at").notNull(),
    stripeId: text("stripe_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("sponsorships_start_end_idx").on(table.startAt, table.endAt)],
);
