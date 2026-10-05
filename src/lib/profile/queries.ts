import "server-only";

import { and, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { isMockMode, mockCreatorProfile } from "@/lib/db/mock-data";
import { getCreatorByUsername, type CreatorProfile } from "@/lib/db/queries";
import { battles, creatorPastProjects, creators, profileHypes } from "@/lib/db/schema";

import { deriveActivity, type ActivityItem } from "./activity";
import type { PastStatus } from "./options";

// Everything the v2 profile page shows (DECISIONS.md § 2026-10-04 "Onboarding
// from X and profile v2"). Hype = battles won + profile hypes.

export interface PastProject {
  name: string;
  line: string;
  url: string;
  year: number | null;
  status: PastStatus;
}

export interface ProfileV2 extends CreatorProfile {
  tagline: string;
  about: string;
  location: string;
  locationHidden: boolean;
  projectName: string;
  projectTagline: string;
  workHow: string | null;
  workStage: string | null;
  workCareer: string | null;
  wantsToMeet: string[];
  openTo: string[];
  into: string[];
  past: PastProject[];
  hype: number;
  /** X's numeric id when known — "Say hi on X" opens a DM with it. */
  xUserId: string | null;
  activity: ActivityItem[];
}

export async function getProfileV2(username: string): Promise<ProfileV2 | null> {
  if (isMockMode()) return mockProfileV2(username);

  const base = await getCreatorByUsername(username);
  if (!base) return null;

  const [extra] = await db
    .select({
      about: creators.about,
      location: creators.location,
      locationHidden: creators.locationHidden,
      projectName: creators.projectName,
      projectTagline: creators.projectTagline,
      workHow: creators.workHow,
      workStage: creators.workStage,
      workCareer: creators.workCareer,
      wantsToMeet: creators.wantsToMeet,
      openTo: creators.openTo,
      into: creators.into,
      xUserId: creators.xUserId,
      profileHypes: sql<number>`(select count(*)::int from ${profileHypes} h where h.creator_id = ${creators}.id)`,
    })
    .from(creators)
    .where(eq(creators.id, base.id));

  const past = await db
    .select({ name: creatorPastProjects.name, line: creatorPastProjects.line, url: creatorPastProjects.url, year: creatorPastProjects.year, status: creatorPastProjects.status })
    .from(creatorPastProjects)
    .where(eq(creatorPastProjects.creatorId, base.id))
    .orderBy(creatorPastProjects.position, desc(creatorPastProjects.createdAt));

  const opponent = alias(creators, "opponent");
  const recent = await db
    .select({
      creatorAId: battles.creatorAId,
      creatorBId: battles.creatorBId,
      winnerId: battles.winnerId,
      auraABefore: battles.auraABefore,
      auraAAfter: battles.auraAAfter,
      auraBBefore: battles.auraBBefore,
      auraBAfter: battles.auraBAfter,
      opponentName: opponent.name,
      createdAt: battles.createdAt,
    })
    .from(battles)
    .innerJoin(
      opponent,
      sql`${opponent.id} = case when ${battles.creatorAId} = ${base.id} then ${battles.creatorBId} else ${battles.creatorAId} end`,
    )
    .where(or(eq(battles.creatorAId, base.id), eq(battles.creatorBId, base.id)))
    .orderBy(desc(battles.createdAt))
    .limit(30);

  return {
    ...base,
    tagline: base.bio ?? "",
    about: extra.about ?? "",
    location: extra.location ?? "",
    locationHidden: extra.locationHidden,
    projectName: extra.projectName ?? "",
    projectTagline: extra.projectTagline ?? "",
    workHow: extra.workHow,
    workStage: extra.workStage,
    workCareer: extra.workCareer,
    wantsToMeet: extra.wantsToMeet,
    openTo: extra.openTo ?? [],
    into: extra.into ?? [],
    past: past.map((p) => ({ name: p.name, line: p.line ?? "", url: p.url ?? "", year: p.year, status: p.status as PastStatus })),
    hype: base.winsCount + (extra.profileHypes ?? 0),
    xUserId: extra.xUserId,
    activity: deriveActivity(base.id, recent),
  };
}

/** Whether this account already hyped this creator from their profile. */
export async function hasProfileHype(creatorId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: profileHypes.id })
    .from(profileHypes)
    .where(and(eq(profileHypes.creatorId, creatorId), eq(profileHypes.userId, userId)));
  return !!row;
}

// PREVIEW_MOCK=1 — the same sample people as the approved prototype, so the
// page can be reviewed on localhost without a database.
const MOCK_EXTRA: Record<string, Partial<ProfileV2>> = {
  harshpatel502: {
    tagline: "Building products and communities for talented people.",
    about: "I build weird internet products and experiment with ways of helping talented people get discovered.",
    location: "🇸🇬 Singapore",
    projectName: "Underhyped.wtf",
    projectTagline: "The internet’s arena for underrated creators.",
    workHow: "Solo",
    workStage: "Building",
    workCareer: "3–5 years",
    wantsToMeet: ["Founders", "Builders"],
    openTo: ["🤝 Collaborating", "🧪 Looking for beta users"],
    into: ["AI", "Community", "Indie hacking", "Startups", "Productivity"],
    past: [
      { name: "Flexclout", line: "Creator rankings by follower count. The idea Underhyped grew out of.", url: "https://flexclout.com", year: 2026, status: "sunset" },
      { name: "PromptDeck", line: "AI tool for writing launch posts.", url: "https://promptdeck.app", year: 2025, status: "failed" },
      { name: "IndieStats", line: "Analytics for indie builders.", url: "https://indiestats.dev", year: 2024, status: "sold" },
      { name: "git-glance", line: "Open-source CLI that summarises a repo in one screen.", url: "https://github.com", year: 2023, status: "oss" },
    ],
  },
};

function mockProfileV2(username: string): ProfileV2 | null {
  const base = mockCreatorProfile(username);
  if (!base) return null;
  const extra = MOCK_EXTRA[username] ?? MOCK_EXTRA.harshpatel502;
  return {
    ...base,
    about: "",
    location: "",
    locationHidden: false,
    projectName: "",
    projectTagline: "",
    workHow: null,
    workStage: null,
    workCareer: null,
    wantsToMeet: [],
    openTo: [],
    into: [],
    past: [],
    hype: base.winsCount + 12,
    xUserId: null,
    activity: [
      { icon: "⚔️", text: "Beat aloha", when: "2h" },
      { icon: "🔥", text: "Crossed 1,500 Aura", when: "1d" },
      { icon: "⚔️", text: "Beat Roman", when: "1d" },
    ],
    ...extra,
    // Keep each sample person's own words where they have them.
    tagline: base.bio || extra.tagline || "",
  };
}
