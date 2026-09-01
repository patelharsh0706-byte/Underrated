"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Kept for a future claim/manage-profile flow — see DECISIONS.md 2026-09-05.
// No current entry point in the UI.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
