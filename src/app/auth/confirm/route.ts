import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureProfile, linkPickerSession } from "@/lib/db/queries";
import { getOrCreateVoterSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Email OTP / magic-link sign-in.
 *
 * The OAuth callback next door handles the PKCE `code` exchange; email links
 * arrive as a `token_hash` + `type` instead and need `verifyOtp`. Same work
 * afterwards — create the profile, claim the browser's voter session, land on
 * their receipts — so the two routes stay deliberately symmetrical.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");

  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  if (tokenHash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

      if (!error) {
        const voterSession = await getOrCreateVoterSession();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const profile = await ensureProfile({
            userId: user.id,
            email: user.email ?? "",
            displayName:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              null,
            avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
          });

          if (voterSession) await linkPickerSession(voterSession, user.id);

          return NextResponse.redirect(
            `${origin}${next ?? (profile ? `/${profile.username}/receipts` : "/receipts")}`,
          );
        }

        return NextResponse.redirect(`${origin}${next ?? "/receipts"}`);
      }
    } catch (error) {
      console.error("Auth confirm error:", error);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
