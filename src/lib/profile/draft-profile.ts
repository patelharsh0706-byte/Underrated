import type { ProfileEdit } from "./options";
import type { ProfileV2 } from "./queries";

// A draft (or an X sign-in in preview mode) drawn as a full profile — used by
// "Looking good?" and by the preview-mode profile page. Pure; no database.

export interface WelcomeMe {
  name: string;
  handle: string;
  avatar: string | null;
}

/** The draft drawn as a profile, for the "Looking good?" preview. */
export function draftProfile(me: WelcomeMe, d: ProfileEdit): ProfileV2 {
  const x = `https://x.com/${me.handle}`;
  return {
    id: "draft",
    username: me.handle,
    name: me.name,
    avatarUrl: me.avatar,
    bio: d.tagline,
    category: null,
    aura: 1500,
    battlesCount: 0,
    winsCount: 0,
    voterCount: 0,
    workUrl: d.projectUrl || null,
    socials: d.projectUrl ? { twitter: x, web: d.projectUrl } : { twitter: x },
    primarySocial: "twitter",
    followerCount: null,
    rank: null,
    // A draft is a free profile until the $3 Arena entry.
    inArena: false,
    tagline: d.tagline,
    about: d.about,
    location: d.location,
    locationHidden: d.locationHidden,
    projectName: d.projectName,
    projectTagline: d.projectTagline,
    workHow: d.workHow ?? null,
    workStage: d.workStage ?? null,
    workCareer: d.workCareer ?? null,
    wantsToMeet: d.wantsToMeet,
    openTo: d.openTo,
    into: d.into,
    past: d.past,
    hype: 0,
    xUserId: null,
    activity: [],
  };
}

