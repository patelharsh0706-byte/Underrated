import { createClient } from "./client";

/**
 * Start Google OAuth sign-in flow.
 * Redirects to Supabase Google auth provider.
 *
 * @param next - Redirect path after auth callback (must start with /).
 *               Defaults to /receipts if not provided or invalid.
 */
export async function startGoogleSignIn(next?: string): Promise<void> {
  const client = createClient();

  // Guard next parameter: must be absolute path, not protocol-relative
  let redirectTo = "/receipts";
  if (next && typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    redirectTo = next;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    console.error("OAuth sign-in error:", error);
    throw error;
  }

  // Redirect happens client-side via window.location
  if (data.url) {
    window.location.href = data.url;
  }
}
