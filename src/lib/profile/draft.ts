import { profileEditSchema, type ProfileEdit } from "./options";

// The first "Looking good?" profile, built from X at sign-in (DECISIONS.md
// § 2026-10-04 "Onboarding from X and profile v2"). The X bio is copied ONCE
// into tagline and About — never synced after. Pure, so it's tested.

export function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const cut = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n).trim();

export function initialDraft(x: { xBio?: string | null; xLocation?: string | null; xUrl?: string | null }): ProfileEdit {
  const url = cut(x.xUrl, 300);
  return profileEditSchema.parse({
    tagline: cut(x.xBio, 140),
    about: cut(x.xBio, 200),
    location: cut(x.xLocation, 40),
    projectUrl: url,
    projectName: url ? cut(domainOf(url), 40) : "",
  });
}

/** Welcome step A: the "What are you building?" link becomes the project. */
export function withProject(draft: ProfileEdit, projectUrl: string): ProfileEdit {
  const next = profileEditSchema.parse({ ...draft, projectUrl });
  const keepName = draft.projectName && domainOf(draft.projectUrl) !== draft.projectName;
  return { ...next, projectName: keepName ? draft.projectName : cut(domainOf(next.projectUrl), 40) };
}

/**
 * The account's saved draft, or — before anything is saved — the one-time X
 * prefill (bio, location, website). Every reader of `accounts.draft` goes
 * through this: reading `draft ?? {}` instead wiped the X prefill on the
 * Welcome step and on a paid entry made before Finish.
 */
export function draftForAccount(account: { draft: unknown; xBio: string | null; xLocation: string | null; xUrl: string | null }): ProfileEdit {
  return account.draft ? profileEditSchema.parse(account.draft) : initialDraft({ xBio: account.xBio, xLocation: account.xLocation, xUrl: account.xUrl });
}
