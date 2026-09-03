"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { sponsorships } from "@/lib/db/schema";
import { getNextSponsorshipStart } from "@/lib/db/queries";
import { sponsorFieldsSchema, type SponsorFields } from "@/lib/sponsor-schema";
import { getUnavatarUrl } from "@/lib/unavatar";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface SponsorCheckoutResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * TODO(dodo-payments): this inserts the sponsorship row directly and skips
 * payment entirely — a deliberate, temporary bridge so the submit → success
 * → live-banner loop is visible before Dodo is wired. Nothing is deployed
 * yet, so there's no real-user exposure; revisit before any real launch.
 *
 * Once Dodo is wired, replace the body below with a real checkout session
 * (pre-created fixed-price Product, metadata carrying the sponsor payload)
 * and move the insert into the webhook handler, exactly like
 * createSubmissionCheckout / the Dodo webhook already do for creators — see
 * actions/creator.ts and api/dodo-payments/webhook/route.ts for the pattern.
 */
export async function createSponsorshipCheckout(
  input: SponsorFields,
): Promise<SponsorCheckoutResult> {
  const parsed = sponsorFieldsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  const imageUrl = data.logoRemoved ? null : getUnavatarUrl(data.targetUrl);
  const startAt = await getNextSponsorshipStart();
  const endAt = new Date(startAt.getTime() + THIRTY_DAYS_MS);

  await db.insert(sponsorships).values({
    sponsorName: data.sponsorName,
    description: data.description || null,
    imageUrl,
    targetUrl: data.targetUrl,
    startAt,
    endAt,
  });

  revalidatePath("/");
  redirect("/sponsor/success");
}
