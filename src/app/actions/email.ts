"use server";

import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { emailSignups } from "@/lib/db/schema";
import {
  EMAIL_SIGNUPS_PER_SESSION_PER_DAY,
  subscribeEmailSchema,
  type SubscribeEmailInput,
} from "@/lib/email-schema";
import { getOrCreateVoterSession } from "@/lib/session";

export interface SubscribeEmailResult {
  error?: string;
  /** True when PREVIEW_MOCK=1 skipped the write — the form must say so. */
  preview?: boolean;
}

/**
 * Store an email from the Home weekly-drop banner or the footer box.
 * Capture only — nothing is sent yet (DECISIONS.md § 2026-09-24). Signing up
 * twice is a success, not an error: the second insert does nothing.
 */
export async function subscribeEmail(input: SubscribeEmailInput): Promise<SubscribeEmailResult> {
  const parsed = subscribeEmailSchema.safeParse(input);
  if (!parsed.success) return { error: "That email looks off — check for a typo." };

  // Preview mode is local-only and must not write to the real database.
  if (isMockMode()) return { preview: true };

  try {
    return await store(parsed.data.email, parsed.data.source);
  } catch (error) {
    // Never leave the visitor with a dead button — e.g. before the
    // email_signups migration has been applied.
    console.error("subscribeEmail failed", error);
    return { error: "Couldn’t save that just now — try again in a minute." };
  }
}

async function store(email: string, source: "drop" | "footer"): Promise<SubscribeEmailResult> {
  const voterSession = await getOrCreateVoterSession();

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [{ value: todayCount }] = await db
    .select({ value: count() })
    .from(emailSignups)
    .where(and(eq(emailSignups.voterSession, voterSession), gte(emailSignups.createdAt, dayStart)));
  if (todayCount >= EMAIL_SIGNUPS_PER_SESSION_PER_DAY) {
    return { error: "That’s a lot of sign-ups from one place — try again tomorrow." };
  }

  await db
    .insert(emailSignups)
    .values({ email, source, voterSession })
    .onConflictDoNothing({ target: emailSignups.email });

  return {};
}
