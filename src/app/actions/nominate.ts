"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { nominate } from "@/lib/db/schema";
import { isUsernameTaken } from "@/lib/db/queries";
import { getOrCreateVoterSession } from "@/lib/session";
import { toUsernameSlug } from "@/lib/unavatar";

/** Same handle grammar the submit flow already uses — see enter-arena-flow.tsx. */
function parseHandle(raw: string): string | null {
  const v = raw.trim().replace(/^@/, "");
  if (!v) return null;
  const m = v.match(/(?:^|\/\/)(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9_]{1,15}$/.test(v)) return v;
  return null;
}

const findInputSchema = z.object({ xInput: z.string().min(1) });

export interface FindNomineeResult {
  error?: string;
  handle?: string;
  /** Set when this handle is already an active creator — nothing gets stored. */
  existingUsername?: string;
}

/** Step 1 -> 2: parse the pasted link and check whether it's already a creator. */
export async function findNominee(input: z.infer<typeof findInputSchema>): Promise<FindNomineeResult> {
  const parsed = findInputSchema.safeParse(input);
  if (!parsed.success) return { error: "That doesn’t look like an X profile link." };

  const handle = parseHandle(parsed.data.xInput);
  if (!handle) return { error: "That doesn’t look like an X profile link." };

  const username = toUsernameSlug(handle);
  // Also deliberately NOT gated by PREVIEW_MOCK — this checks against real
  // creators, since a real nomination is about to be written either way.
  if (await isUsernameTaken(username)) {
    return { handle, existingUsername: username };
  }

  return { handle };
}

const submitInputSchema = z.object({
  xInput: z.string().min(1),
  note: z.string().trim().max(140).optional(),
});

export interface SubmitNominationResult {
  error?: string;
}

/** Step 3 -> 4: store the nomination. One per anonymous session. */
export async function submitNomination(
  input: z.infer<typeof submitInputSchema>,
): Promise<SubmitNominationResult> {
  const parsed = submitInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Something about that submission didn’t look right." };

  const handle = parseHandle(parsed.data.xInput);
  if (!handle) return { error: "That doesn’t look like an X profile link." };

  // Deliberately NOT gated by PREVIEW_MOCK — unlike the browsing pages, a
  // nomination is a real lead the operator acts on, so it always writes to
  // the real `nominate` table even while the rest of the app is in preview
  // mode. See DATABASE.md § nominate.
  const voterSession = await getOrCreateVoterSession();

  const [existing] = await db
    .select({ id: nominate.id })
    .from(nominate)
    .where(eq(nominate.voterSession, voterSession));
  if (existing) {
    return { error: "You’ve already nominated someone — one per person for now." };
  }

  try {
    await db.insert(nominate).values({
      xProfileUrl: `https://x.com/${handle}`,
      handle,
      note: parsed.data.note || null,
      voterSession,
    });
  } catch {
    // The unique index on voter_session is the real guard; the select above
    // is just the fast path. A concurrent double-submit lands here instead.
    return { error: "You’ve already nominated someone — one per person for now." };
  }

  return {};
}
