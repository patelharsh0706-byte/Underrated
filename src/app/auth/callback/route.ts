import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateVoterSession } from "@/lib/session";
import { linkPickerSession } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/receipts";

  // Guard next parameter: must be absolute path, not protocol-relative
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/receipts";
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Get or create voter session
        const voterSession = await getOrCreateVoterSession();

        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && voterSession) {
          // Link voter session to user identity
          // First link wins: ON CONFLICT DO NOTHING
          await linkPickerSession(voterSession, user.id);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error("Auth callback error:", error);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
