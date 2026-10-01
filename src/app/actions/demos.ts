"use server";

import { head } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { demoClicks, demoJudgements, demos } from "@/lib/db/schema";
import { getDemoTally } from "@/lib/demos/queries";
import { clickDemoSchema, createDemoSchema, encodeDemoData, isOurDemoBlob, judgeDemoSchema, type CreateDemoInput } from "@/lib/demos/schemas";
import { getDodoClient } from "@/lib/dodo-payments";
import { clientEnv, demoProductId } from "@/lib/env";
import { getOrCreateVoterSession } from "@/lib/session";

// Underhyped Demos writes — DATABASE.md § demos, DECISIONS.md § 2026-10-01.
// PREVIEW_MOCK=1 never writes: the page keeps its Phase 1 sample behaviour.

export interface CreateDemoResult {
  error?: string;
  /** The $3 Dodo checkout to send the maker to next. */
  payUrl?: string;
}

/** A Dodo checkout session for the $3 demo entry, returning to the review step. */
async function demoCheckout(email: string | null, metadata: Record<string, string> | null): Promise<string> {
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL;
  const session = await getDodoClient().checkoutSessions.create({
    product_cart: [{ product_id: demoProductId(), quantity: 1 }],
    customer: email ? { email } : null,
    // Dodo appends ?payment_id=…&status=… itself.
    return_url: `${appUrl}/demos/submit?paid=1`,
    cancel_url: `${appUrl}/demos/submit`,
    metadata,
  });
  if (!session.checkout_url) throw new Error("Dodo Payments did not return a checkout URL");
  return session.checkout_url;
}

/**
 * Checks a submission after the browser has uploaded the video to Blob, then
 * starts the $3 checkout with the form as payment metadata. **Saves nothing**:
 * the demo row is written by the Dodo webhook once the payment succeeds
 * (DATABASE.md § demos). Re-checks the Blob object on the server — a browser
 * check can be bypassed.
 */
export async function createDemo(input: CreateDemoInput): Promise<CreateDemoResult> {
  const parsed = createDemoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something about that submission didn’t look right." };
  const d = parsed.data;
  if (isMockMode()) return { error: "Preview mode — nothing is uploaded or saved." };
  if (!isOurDemoBlob(d.videoUrl)) return { error: "That upload didn’t come from Underhyped — try uploading again." };

  let videoBytes: number;
  try {
    const blob = await head(d.videoUrl);
    if (!/^video\/(mp4|webm)$/.test(blob.contentType) || blob.size > 8 * 1024 * 1024) {
      return { error: "That file isn’t an MP4/WebM under 8 MB — export again at 1280×720." };
    }
    videoBytes = blob.size;
  } catch (error) {
    console.error("createDemo: Blob check failed", error);
    return { error: "Couldn’t check your upload just now — try again in a minute." };
  }

  try {
    // The size Blob reported, not the browser's number.
    return { payUrl: await demoCheckout(d.contactEmail, encodeDemoData({ ...d, videoBytes })) };
  } catch (error) {
    // Logged with the real reason (missing product id, Dodo down…) — the maker
    // only needs to know checkout didn't start.
    console.error("createDemo: couldn't start Dodo checkout", error);
    return { error: "Couldn’t start checkout — try again in a minute." };
  }
}

/**
 * Preview mode only: a real (test-mode) Dodo checkout with no demo attached,
 * so the Submit page can still walk through payment. Uploads and saves nothing.
 */
export async function previewDemoCheckout(): Promise<CreateDemoResult> {
  if (!isMockMode()) return { error: "Not in preview mode." };
  try {
    return { payUrl: await demoCheckout(null, null) };
  } catch (error) {
    console.error("previewDemoCheckout failed", error);
    return { error: "Set DODO_PAYMENTS_DEMO_PRODUCT_ID (and the Dodo API key) to try checkout in preview." };
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
