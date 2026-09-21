import { NextResponse } from "next/server";

import { finishSignIn } from "@/lib/receipts/profile";
import { safeNextPath } from "@/lib/supabase/callback-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth callback: exchanges the PKCE `code` for a session, then hands
 * off to finishSignIn for the profile and voter-session work it shares with
 * the email-confirm route next door.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/sign-in?error=auth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback: code exchange failed", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }

  // Signed in from here on. `next` is re-validated server-side; an empty
  // string means "no preference", which finishSignIn resolves to the user's
  // own receipts page.
  const next = safeNextPath(searchParams.get("next"), "") || null;
  return NextResponse.redirect(`${origin}${await finishSignIn(supabase, next)}`);
}
