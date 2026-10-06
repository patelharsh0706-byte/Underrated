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
    // Retired 2026-10-06: the app links accounts by x_user_id only. Kept
    // because the live `main` code still selects it; dropped after deploy.
    userId: uuid("user_id").references(() => authUsers.id),
    username: text("username").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    category: text("category"),
    workUrl: text("work_url"),
    socials: jsonb("socials"),
    primarySocial: text("primary_social"),
    // X's permanent user id, saved the first time the creator is claimed
    // (DATABASE.md § accounts). Null for unclaimed creators.
    xUserId: text("x_user_id"),
    // Profile v2 — DATABASE.md § Profile v2 fields. All optional; empty
    // sections are hidden. Lists are validated in src/lib/profile/options.ts.
    about: text("about"),
    location: text("location"),
    locationHidden: boolean("location_hidden").notNull().default(false),
    projectName: text("project_name"),
    projectTagline: text("project_tagline"),
    workHow: text("work_how"),
    workStage: text("work_stage"),
    workCareer: text("work_career"),
    wantsToMeet: text("wants_to_meet").array().notNull().default(sql`'{}'::text[]`),
    openTo: text("open_to").array().notNull().default(sql`'{}'::text[]`),
    into: text("into").array().notNull().default(sql`'{}'::text[]`),
    followerCount: integer("follower_count"),
    entryFeeCents: integer("entry_fee_cents"),
    dodoPaymentId: text("dodo_payment_id"),
    aura: integer("aura").notNull().default(1500),
    battlesCount: integer("battles_count").notNull().default(0),
    winsCount: integer("wins_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    // A free profile from onboarding v2: shown on /c/, never paired or ranked
    // until the $3 Arena entry flips is_active (DATABASE.md § Onboarding v2).
    profileOnly: boolean("profile_only").notNull().default(false),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("creators_username_key").on(table.username),
    uniqueIndex("creators_user_id_key").on(table.userId),
    uniqueIndex("creators_dodo_payment_key").on(table.dodoPaymentId),
    uniqueIndex("creators_x_user_id_key").on(table.xUserId),
    index("creators_aura_idx").on(table.aura.desc()),
    index("creators_is_active_idx").on(table.isActive),
  ],
);

// One row per person who signed in with X — DATABASE.md § accounts.
// email is private: never selected by a public read.
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id),
    xUserId: text("x_user_id").notNull(),
    xUsername: text("x_username").notNull(),
    xName: text("x_name"),
    xAvatarUrl: text("x_avatar_url"),
    email: text("email"),
    // The creator this account owns is the one with the same x_user_id — no
    // separate link column (DATABASE.md § accounts, 2026-10-06).
    // Onboarding: draft starts as the one-time X prefill; private.
    onboardedAt: timestamptz("onboarded_at"),
    draft: jsonb("draft"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_x_user_id_key").on(table.xUserId),
  ],
);

// "Previously cooked" — DATABASE.md § creator_past_projects.
export const creatorPastProjects = pgTable(
  "creator_past_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    name: text("name").notNull(),
    line: text("line"),
    url: text("url"),
    year: integer("year"),
    // 'live' | 'sold' | 'sunset' | 'failed' | 'oss'
    status: text("status").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("creator_past_projects_creator_idx").on(table.creatorId, table.position),
    check("creator_past_projects_status_check", sql`${table.status} in ('live', 'sold', 'sunset', 'failed', 'oss')`),
  ],
);

// The profile "⚡ Hype" button — one per account per creator. Adds to Hype,
// never to Aura or rank. DATABASE.md § profile_hypes.
export const profileHypes = pgTable(
  "profile_hypes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creators.id),
    userId: uuid("user_id").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profile_hypes_creator_user_key").on(table.creatorId, table.userId)],
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
    // A browser session id (anonymous, before 2026-10-04) or "x:<X user id>"
    // for a signed-in pick — RANKING.md § Scoring.
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
    // One scoring pick per unordered pair per X person — DATABASE.md § accounts.
    uniqueIndex("battles_x_pair_key")
      .on(
        table.voterSession,
        sql`least(${table.creatorAId}, ${table.creatorBId})`,
        sql`greatest(${table.creatorAId}, ${table.creatorBId})`,
      )
      .where(sql`${table.voterSession} like 'x:%'`),
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

// Email capture from the Home weekly-drop banner and the footer's "Get the
// latest" box. Capture only — nothing sends mail yet. Nothing here links to
// creators, Aura or the game loop. See DATABASE.md § email_signups and
// DECISIONS.md § 2026-09-24.
export const emailSignups = pgTable(
  "email_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Trimmed + lower-cased by subscribeEmail before insert.
    email: text("email").notNull(),
    // 'drop' | 'footer' — which box it came from.
    source: text("source").notNull(),
    voterSession: text("voter_session"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("email_signups_email_key").on(table.email),
    index("email_signups_session_created_idx").on(table.voterSession, table.createdAt),
  ],
);

// Underhyped Demos — a product's 15-second screen recording, judged
// Underhyped / Not yet. A demo is a product, not a creator: nothing here
// touches creators, Aura or battles. See DATABASE.md § demos and DECISIONS.md
// § 2026-09-30, § 2026-10-01.
export const demos = pgTable(
  "demos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productName: text("product_name").notNull(),
    tagline: text("tagline").notNull(),
    productUrl: text("product_url").notNull(),
    category: text("category").notNull(),
    // Lower-cased; pre-filled at checkout, and the fallback match against
    // payments.customer_email when paid_at stays null.
    contactEmail: text("contact_email").notNull(),
    videoUrl: text("video_url").notNull(),
    videoBytes: integer("video_bytes").notNull(),
    videoWidth: integer("video_width"),
    videoHeight: integer("video_height"),
    durationMs: integer("duration_ms").notNull(),
    // 'submitted' | 'approved' | 'rejected' | 'hidden' — set to 'approved' by
    // the operator in the Supabase Table Editor. Only approved demos show.
    status: text("status").notNull().default("submitted"),
    voterSession: text("voter_session"),
    // Set by the Dodo webhook from the payment's metadata_demo_id
    // (DATABASE.md § demos). Null until the $3 payment arrives.
    paidAt: timestamptz("paid_at"),
    dodoPaymentId: text("dodo_payment_id").unique(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("demos_status_created_idx").on(table.status, table.createdAt),
    index("demos_session_created_idx").on(table.voterSession, table.createdAt),
    check("demos_status_check", sql`${table.status} in ('submitted', 'approved', 'rejected', 'hidden')`),
  ],
);

// One visitor judging one demo — unique, so two tabs can't vote twice.
export const demoJudgements = pgTable(
  "demo_judgements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    demoId: uuid("demo_id")
      .notNull()
      .references(() => demos.id),
    voterSession: text("voter_session").notNull(),
    // 'underhyped' | 'not_yet'
    verdict: text("verdict").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("demo_judgements_demo_session_key").on(table.demoId, table.voterSession),
    index("demo_judgements_demo_created_idx").on(table.demoId, table.createdAt),
    check("demo_judgements_verdict_check", sql`${table.verdict} in ('underhyped', 'not_yet')`),
  ],
);

// "View product ↗" — counted once per visitor per demo.
export const demoClicks = pgTable(
  "demo_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    demoId: uuid("demo_id")
      .notNull()
      .references(() => demos.id),
    voterSession: text("voter_session").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("demo_clicks_demo_session_key").on(table.demoId, table.voterSession)],
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
