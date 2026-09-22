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

// Ledger of money received. One row per successful Dodo payment, written by
// the webhook before any attempt to create a creator — so a payment whose
// form data was lost still lands here with the payer's email. Read by nothing
// in the game loop; it never influences Aura, pairing, or rank. See
// DATABASE.md § payments.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dodoPaymentId: text("dodo_payment_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    // From the submitted form via payment metadata. Null while the static
    // Payment Link is in use, since that carries no form data.
    xProfileUrl: text("x_profile_url"),
    workUrl: text("work_url"),
    metadata: jsonb("metadata"),
    // Null until a creator exists for this payment — the orphan list.
    creatorId: uuid("creator_id").references(() => creators.id),
    receivedAt: timestamptz("received_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_dodo_payment_key").on(table.dodoPaymentId),
    index("payments_creator_id_idx").on(table.creatorId),
  ],
);

// Pure lead capture — a stranger pointing at an X profile they think belongs
// in the Arena. Nothing here writes to `creators`, Aura, or a battle; a
// nomination becomes a creator only through the normal paid /submit flow,
// after the operator has contacted them on X. See DATABASE.md § nominate and
// DECISIONS.md § 2026-09-22.
export const nominate = pgTable(
  "nominate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xProfileUrl: text("x_profile_url").notNull(),
    handle: text("handle").notNull(),
    note: text("note"),
    voterSession: text("voter_session").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("nominate_voter_session_key").on(table.voterSession)],
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
