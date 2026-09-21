import Link from "next/link";

import { getUserId, hasAuthCookie } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/db/queries";

/** First letters of a name, or of a handle when there is no name. */
function initialsOf(label: string): string {
  const parts = label.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return (letters.join("") || "?").toUpperCase();
}

/**
 * The signed-in picker's face in the header, linking to /account.
 *
 * A Server Component on purpose: the header renders on every page, and making
 * it a client island would pull the whole shell into the client bundle — see
 * the note in site-header.tsx about why the desktop nav has no active state.
 *
 * Renders nothing at all when signed out, so an anonymous visitor sees exactly
 * the header they see today and pays no query for it (hasAuthCookie is a
 * cookie read; the profile lookup is by primary key and only runs past it).
 * Signed in without a profile also renders nothing — this component must
 * stay read-only because it's on every route, including ISR pages, which
 * must not gain a write. Self-heal happens on /receipts and /account
 * (both force-dynamic) — see lib/receipts/profile.ts — and the avatar
 * simply appears once one of those has run for that user.
 */
export async function AccountAvatar() {
  if (!(await hasAuthCookie())) return null;

  const userId = await getUserId();
  if (!userId) return null;

  // Deliberately read-only: this renders on every route, including ISR
  // pages, so it must not write. Self-heal for a signed-in user with no
  // profile happens on /receipts and /account (both force-dynamic) instead;
  // the avatar simply appears once one of those has run for this user.
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;

  const label = profile.displayName ?? profile.username;

  return (
    <Link
      href="/account"
      aria-label="Your account"
      title={label}
      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline-2 bg-muted font-display text-[11px] font-bold text-ink-soft transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none sm:size-9 sm:text-xs"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(label)
      )}
    </Link>
  );
}
