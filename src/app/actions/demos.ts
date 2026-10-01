"use server";

import { head } from "@vercel/blob";
import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { demoClicks, demoJudgements, demos } from "@/lib/db/schema";
import { getDemoTally } from "@/lib/demos/queries";
import { clickDemoSchema, createDemoSchema, demoCheckoutUrl, isOurDemoBlob, judgeDemoSchema, type CreateDemoInput } from "@/lib/demos/schemas";
import { demoPaymentLink } from "@/lib/env";
import { getOrCreateVoterSession } from "@/lib/session";

// Underhyped Demos writes — DATABASE.md § demos, DECISIONS.md § 2026-10-01.
// PREVIEW_MOCK=1 never writes: the page keeps its Phase 1 sample behaviour.

const DEMOS_PER_SESSION_PER_DAY = 3;

export interface CreateDemoResult {
  error?: string;
  /** The $3 Dodo checkout to send the maker to next. */
  payUrl?: string;
}

/**
 * Store a submitted demo as 'submitted' after the browser has uploaded the
 * file to Blob. Re-checks the Blob object on the server (a browser check can
 * be bypassed), then returns the $3 payment link. Nothing shows publicly until
 * the operator approves it in Supabase.
 */
export async function createDemo(input: CreateDemoInput): Promise<CreateDemoResult> {
  const parsed = createDemoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something about that submission didn’t look right." };
  const d = parsed.data;
  if (isMockMode()) return { error: "Preview mode — nothing is uploaded or saved." };
  if (!isOurDemoBlob(d.videoUrl)) return { error: "That upload didn’t come from Underhyped — try uploading again." };

  let payUrl: string;
  try {
    payUrl = demoPaymentLink();
  } catch {
    return { error: "Demo payments aren’t switched on yet — try again soon." };
  }

  try {
    const blob = await head(d.videoUrl);
    if (!/^video\/(mp4|webm)$/.test(blob.contentType) || blob.size > 8 * 1024 * 1024) {
      return { error: "That file isn’t an MP4/WebM under 8 MB — export again at 1280×720." };
    }

    const voterSession = await getOrCreateVoterSession();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [{ value: today }] = await db
      .select({ value: count() })
      .from(demos)
      .where(and(eq(demos.voterSession, voterSession), gte(demos.createdAt, dayStart)));
    if (today >= DEMOS_PER_SESSION_PER_DAY) return { error: "That’s 3 demos today from here — come back tomorrow." };

    const [row] = await db.insert(demos).values({
      productName: d.productName,
      tagline: d.tagline,
      productUrl: d.productUrl,
      category: d.category,
      contactEmail: d.contactEmail,
      videoUrl: d.videoUrl,
      videoBytes: blob.size,
      videoWidth: d.videoWidth,
      videoHeight: d.videoHeight,
      durationMs: d.durationMs,
      voterSession,
    }).returning({ id: demos.id });
    // The id rides along as payment metadata so the webhook can mark this
    // demo paid (DATABASE.md § demos).
    return { payUrl: demoCheckoutUrl(payUrl, row.id, d.contactEmail) };
  } catch (error) {
    console.error("createDemo failed", error);
    return { error: "Couldn’t save your demo just now — try again in a minute." };
  }
}

/**
 * Preview mode only: the payment link, so the Submit page can still walk
 * through Dodo's checkout. Uploads and saves nothing.
 */
export async function previewDemoCheckout(): Promise<CreateDemoResult> {
  if (!isMockMode()) return { error: "Not in preview mode." };
  try {
    return { payUrl: demoPaymentLink() };
  } catch {
    return { error: "Set DODO_PAYMENTS_DEMO_LINK to try checkout in preview." };
  }
}

export interface JudgeDemoResult {
  error?: string;
  judges?: number;
  underhyped?: number;
  clicks?: number;
  /** False when this visitor had already judged it (the vote didn't count again). */
  counted?: boolean;
}

/** One judgement per visitor per demo — the unique index makes a repeat a no-op. */
export async function judgeDemo(input: { demoId: string; verdict: "underhyped" | "not_yet" }): Promise<JudgeDemoResult> {
  const parsed = judgeDemoSchema.safeParse(input);
  if (!parsed.success) return { error: "That vote didn’t look right." };
  if (isMockMode()) return { counted: false };
  try {
    const voterSession = await getOrCreateVoterSession();
    const [demo] = await db.select({ status: demos.status }).from(demos).where(eq(demos.id, parsed.data.demoId));
    if (demo?.status !== "approved") return { error: "That demo isn’t live." };
    const inserted = await db
      .insert(demoJudgements)
      .values({ demoId: parsed.data.demoId, voterSession, verdict: parsed.data.verdict })
      .onConflictDoNothing({ target: [demoJudgements.demoId, demoJudgements.voterSession] })
      .returning({ id: demoJudgements.id });
    return { ...(await getDemoTally(parsed.data.demoId)), counted: inserted.length > 0 };
  } catch (error) {
    console.error("judgeDemo failed", error);
    return { error: "Couldn’t save that vote — try again." };
  }
}

/** "View product ↗" — counted once per visitor per demo. */
export async function clickDemo(input: { demoId: string }): Promise<void> {
  const parsed = clickDemoSchema.safeParse(input);
  if (!parsed.success || isMockMode()) return;
  try {
    const voterSession = await getOrCreateVoterSession();
    await db
      .insert(demoClicks)
      .values({ demoId: parsed.data.demoId, voterSession })
      .onConflictDoNothing({ target: [demoClicks.demoId, demoClicks.voterSession] });
  } catch (error) {
    console.error("clickDemo failed", error);
  }
}
