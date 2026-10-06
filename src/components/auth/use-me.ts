"use client";

import { useEffect, useState } from "react";

import { getMyProfileState } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";

// Who is signed in with X, read in the browser (auth only, never game data),
// so the cached pages behind the header stay cached. Shared by the header's
// account menu and the phone menu.

export interface Me {
  name: string;
  handle: string;
  avatar: string | null;
}

function meFrom(user: { user_metadata?: Record<string, unknown> } | null): Me | null {
  if (!user) return null;
  const m = user.user_metadata ?? {};
  const handle = String(m.user_name ?? m.preferred_username ?? "").replace(/^@/, "");
  return { name: String(m.full_name ?? m.name ?? handle), handle, avatar: typeof m.avatar_url === "string" ? m.avatar_url : null };
}

/** `me`: undefined while loading, null when signed out. `myUsername`: the creator they own, if any. */
export function useMe(): { me: Me | null | undefined; myUsername: string | null } {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setMe(meFrom(data.user));
      if (data.user) void getMyProfileState({}).then((st) => setMyUsername(st.myUsername));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setMe(meFrom(session?.user ?? null)));
    return () => data.subscription.unsubscribe();
  }, []);

  return { me, myUsername };
}
