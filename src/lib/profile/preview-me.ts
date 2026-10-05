import "server-only";

import { cookies } from "next/headers";

import { PREVIEW_PROFILE_DONE_COOKIE } from "@/lib/account";
import { xIdentityFromUser } from "@/lib/account-claim";
import { createClient } from "@/lib/supabase/server";

import { initialDraft } from "./draft";
import type { WelcomeMe } from "./draft-profile";
import { profileEditSchema, type ProfileEdit } from "./options";

// PREVIEW_MOCK=1 only: who is signed in with X, from the Supabase session and
// the one-time X prefill cookie set by /auth/callback — never the database.

/** PREVIEW_MOCK=1: the onboarding draft so far (set by saveDraft / finishProfile). */
export const PREVIEW_DRAFT_COOKIE = "uh-preview-draft";

export interface PreviewMe {
  me: WelcomeMe;
  email: string;
  draft: ProfileEdit;
  /** "Finish profile" was pressed — votes count from here on. */
  profileDone: boolean;
}

export async function getPreviewMe(): Promise<PreviewMe | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const x = user ? xIdentityFromUser(user) : null;
  if (!user || !x) return null;

  const jar = await cookies();
  let prefill: { bio?: string | null; location?: string | null; url?: string | null } = {};
  try {
    prefill = JSON.parse(jar.get("uh-x-prefill")?.value ?? "{}");
  } catch {
    prefill = {};
  }
  let saved: ProfileEdit | null = null;
  try {
    const parsed = profileEditSchema.safeParse(JSON.parse(jar.get(PREVIEW_DRAFT_COOKIE)?.value ?? "null"));
    saved = parsed.success ? parsed.data : null;
  } catch {
    saved = null;
  }
  return {
    me: { name: x.xName || x.xUsername, handle: x.xUsername, avatar: x.xAvatarUrl ? x.xAvatarUrl.replace("_normal.", "_400x400.") : null },
    email: user.email ?? "",
    draft: saved ?? initialDraft({ xBio: prefill.bio, xLocation: prefill.location, xUrl: prefill.url }),
    profileDone: jar.get(PREVIEW_PROFILE_DONE_COOKIE)?.value === user.id,
  };
}
