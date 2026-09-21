import { buildCallbackUrl } from "./callback-url";
import { createClient } from "./client";

/**
 * Start Google OAuth sign-in flow.
 * Redirects to Supabase Google auth provider.
 *
 * Runs in the browser (it assigns window.location), so the callback URL is
 * built from the page's own origin — see callback-url.ts for why it must
 * never come from an env var.
 *
 * @param next - Redirect path after auth callback (must start with /).
 *               Defaults to /receipts if not provided or invalid.
 */
export async function startGoogleSignIn(next?: string): Promise<void> {
  const client = createClient();

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildCallbackUrl(window.location.origin, next, "/receipts"),
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
