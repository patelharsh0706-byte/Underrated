"use client";

import { startGoogleSignIn } from "@/lib/supabase/oauth";

export function SignInButton() {
  return (
    <button
      onClick={() => startGoogleSignIn("/receipts")}
      className="bg-lime-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-lime-500"
    >
      Sign in with Google
    </button>
  );
}
