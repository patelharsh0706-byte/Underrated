import { NextResponse } from "next/server";

import { fetchXProfile, PREVIEW_PROFILE_DONE_COOKIE, syncAccountFromUser } from "@/lib/account";
import { isMockMode } from "@/lib/db/mock-data";
import { createClient } from "@/lib/supabase/server";

// Sign in with X lands here (DECISIONS.md § 2026-10-04). Exchange the code,
// create/refresh the account and auto-claim an existing creator. Votes count
// only once the free profile is finished (§ 2026-10-05 "Onboarding v2"), so a
// new person goes straight to /welcome, carrying where they were — usually
// /arena?resume=1, which replays their pick after "Finish profile".
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/arena";
  // Only ever redirect within this site.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/arena";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      let onboarded = true;
      // Preview mode: no database — "Finish profile" leaves a cookie instead.
      if (isMockMode()) {
        const cookie = request.headers.get("cookie") ?? "";
        onboarded = cookie.split(/;\s*/).includes(`${PREVIEW_PROFILE_DONE_COOKIE}=${data.user.id}`);
      } else try {
        const account = await syncAccountFromUser(data.user, data.session?.provider_token);
        // A claimed creator can already vote, but still sees the steps once.
        onboarded = account ? account.onboarded && !!account.creatorId : true;
      } catch (err) {
        // The session is valid; picks will ask again if the account row is missing.
        console.error("auth/callback: account sync failed", err);
      }
      if (!onboarded) {
        const dest = `/welcome?next=${encodeURIComponent(next)}`;
        const res = NextResponse.redirect(`${origin}${dest}`);
        // Preview mode keeps no account row, so the one-time X prefill (bio,
        // location, website) rides to /welcome in a short-lived private cookie.
        if (isMockMode()) {
          const prefill = await fetchXProfile(data.session?.provider_token);
          res.cookies.set("uh-x-prefill", JSON.stringify(prefill), { httpOnly: true, sameSite: "lax", maxAge: 60 * 30, path: "/" });
        }
        return res;
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
