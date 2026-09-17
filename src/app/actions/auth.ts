"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Entry point: the Sign out row on /account, reached from the header avatar.
// (Was dormant with no UI entry point from 2026-09-05 until Receipts.)
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
