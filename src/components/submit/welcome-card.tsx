import Image from "next/image";
import Link from "next/link";

import { MarkerSwipe } from "@/components/marker-swipe";
import { ShareButton } from "@/components/profile/share-button";
import { Scribble } from "@/components/scribble";
import type { CreatorProfile, PublicCreator } from "@/lib/db/queries";
import { isRanked, PLACEMENT_BATTLES_REQUIRED } from "@/lib/ranking/placement";

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const STEPS = [
  {
    title: "We review your profile",
    body: "We make sure everything looks good.",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M8.5 9h7M8.5 13h7M8.5 17h4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    title: "You enter placement battles",
    body: "We’ll match you against other underhyped creators.",
    icon: (
      <>
        <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M5 5l3.2 0M19 5l-3.2 0M5 19l3.2 0M19 19l-3.2 0"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    title: "The internet decides",
    body: "Hype moves your Aura — never money.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16.5" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M3.5 18c.8-3 3-4.4 5.5-4.4S13.7 15 14.5 18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M17 13.8c2 .3 3.4 1.6 4 4.2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    title: "Your Aura grows",
    body: "Win battles, climb the leaderboard, get discovered.",
    icon: (
      <>
        <rect x="3.5" y="13" width="4" height="7.5" rx="1" fill="currentColor" />
        <rect x="10" y="8.5" width="4" height="12" rx="1" fill="currentColor" />
        <rect x="16.5" y="4" width="4" height="16.5" rx="1" fill="currentColor" />
      </>
    ),
  },
];

interface WelcomeCardProps {
  creator: CreatorProfile;
  profileUrl: string;
  /** Other creators already in the Arena — the people they'll be matched
   *  against. Each links to its profile so the facepile reads as creators,
   *  not as an invented audience. See DECISIONS.md § 2026-09-10
   *  "Pulse-row faces are creators, never voters". */
  arenaFaces: PublicCreator[];
}

export function WelcomeCard({ creator, profileUrl, arenaFaces }: WelcomeCardProps) {
  const placed = isRanked(creator.battlesCount, creator.voterCount);
  const battlesDone = Math.min(creator.battlesCount, PLACEMENT_BATTLES_REQUIRED);
  const progress = Math.round((battlesDone / PLACEMENT_BATTLES_REQUIRED) * 100);
  const primaryHref =
    creator.primarySocial && creator.socials ? creator.socials[creator.primarySocial] : null;

  return (
    <div className="relative mx-auto w-full max-w-[780px]">
      <Scribble side="left" lines={["good people", "deserve", "more hype."]} top={74} />
      <Scribble side="right" lines={["small creators.", "big impact."]} top={30} />

      <div className="px-0 pt-10 pb-[26px] text-center">
        <div className="mb-1.5 flex justify-center">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-lime shadow-[0_10px_22px_-12px_rgb(196_238_31/0.9)]">
            <svg
              viewBox="0 0 108 108"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[22px] text-ink-faint"
            >
              <path
                d="M90 54L102 54 M80.9 80.9L86.5 86.5 M54 90L54 102 M27.1 80.9L21.5 86.5 M18 54L6 54 M27.1 27.1L21.5 21.5 M54 18L54 6 M80.9 27.1L86.5 21.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[26px] w-[26px]">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <h1 className="mx-auto max-w-[13ch] font-display text-[clamp(32px,7vw,48px)] leading-[0.98] font-black tracking-[-0.04em]">
          You’re in the <MarkerSwipe>Arena!</MarkerSwipe>
        </h1>
        <p className="mx-auto mt-3.5 max-w-[46ch] text-base text-ink-soft sm:text-lg">
          Your profile has been submitted. We’ll get you ready for your first placement battle
          soon.
        </p>
      </div>

      <div className="relative w-full rounded-card bg-card p-4 shadow-card sm:p-7">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
          {/* 12px, not a radius-scale utility: DESIGN.md fixes square identity
              avatars at 12px, and rounded-xl tracks shadcn's --radius (16.8px). */}
          <div className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-[12px] bg-muted sm:h-[108px] sm:w-[108px]">
            {creator.avatarUrl ? (
              <Image
                src={creator.avatarUrl}
                alt={creator.name}
                fill
                sizes="108px"
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>

          <div className="min-w-0 sm:pt-0.5">
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">
              {creator.name}
            </h2>
            <p className="mt-0.5 text-[15px] font-medium text-ink-soft">@{creator.username}</p>

            {creator.bio ? (
              <p className="mt-[9px] text-[15px] leading-[1.45] font-medium">{creator.bio}</p>
            ) : null}

            {creator.category ? (
              <span className="mt-[11px] inline-block rounded-full border border-hairline bg-card px-3 py-[5px] text-[13px] font-semibold whitespace-nowrap text-ink-soft">
                {creator.category}
              </span>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              {creator.workUrl ? (
                <a
                  href={creator.workUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-[220px] items-center gap-1.5 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap text-ink-soft transition-colors hover:text-foreground"
                >
                  ↗ <span className="truncate">{hostFromUrl(creator.workUrl)}</span>
                </a>
              ) : null}

              {creator.workUrl && primaryHref ? (
                <span className="h-3.5 w-px bg-hairline-2" aria-hidden="true" />
              ) : null}

              {primaryHref ? (
                <a
                  href={primaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X profile"
                  className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-primary text-[13.5px] text-primary-foreground transition-transform hover:-translate-y-px"
                >
                  𝕏
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* The stat row gets its own tinted panel rather than being packed in
            with the identity block above it. */}
        <div className="mt-5 flex flex-wrap items-start justify-around gap-4 rounded-[14px] bg-foreground/[0.035] px-3 py-4 sm:gap-5 sm:px-4 sm:py-[18px]">
          <div className="flex flex-col items-center gap-[3px]">
            <b className="font-display text-[19px] font-extrabold tracking-[-0.02em] tabular-nums sm:text-[23px]">
              🔥 {creator.aura}
            </b>
            <small className="text-[10.5px] font-bold tracking-[0.1em] text-ink-soft uppercase sm:text-[11.5px]">
              Aura
            </small>
          </div>

          <div className="flex flex-col items-center gap-[3px]">
            {placed && creator.rank !== null ? (
              <>
                <b className="font-display text-[19px] font-extrabold tracking-[-0.02em] tabular-nums sm:text-[23px]">
                  #{creator.rank}
                </b>
                <small className="text-[10.5px] font-bold tracking-[0.1em] text-ink-soft uppercase sm:text-[11.5px]">
                  Rank
                </small>
              </>
            ) : (
              <>
                <span className="mb-px rounded-full bg-aura/12 px-[11px] py-[5px] text-[11.5px] font-bold tracking-[0.08em] text-aura uppercase">
                  New challenger
                </span>
                <b className="mt-1 font-display text-[14.5px] font-extrabold tracking-[-0.02em] tabular-nums">
                  {battlesDone}/{PLACEMENT_BATTLES_REQUIRED} placement battles
                </b>
                <div className="h-[9px] w-[108px] overflow-hidden rounded-full border border-hairline-2 bg-card sm:w-[132px]">
                  <span className="block h-full bg-aura" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-0.5 max-w-[30ch] text-[12.5px] font-medium text-ink-soft">
                  The internet is still deciding.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-[3px]">
            <b className="font-display text-[19px] font-extrabold tracking-[-0.02em] tabular-nums sm:text-[23px]">
              {creator.winsCount}/{creator.battlesCount}
            </b>
            <small className="text-[10.5px] font-bold tracking-[0.1em] text-ink-soft uppercase sm:text-[11.5px]">
              Wins
            </small>
          </div>
        </div>
      </div>

      <div className="mt-[30px] w-full text-center sm:mt-10">
        <p className="mb-1.5 font-display text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
          What happens next?
        </p>
        <h2 className="mb-6 font-display text-[22px] font-extrabold tracking-[-0.03em] sm:mb-[30px] sm:text-[26px]">
          Here’s what to expect
        </h2>

        <ol className="relative grid list-none grid-cols-2 gap-x-3.5 gap-y-[26px] p-0 sm:grid-cols-4 sm:gap-y-3.5">
          {/* The connecting line sits under the icon rings — z-order, not a
              gap, is what makes it read as linking the circles. */}
          <span
            aria-hidden="true"
            className="absolute top-[30px] left-[12.5%] right-[12.5%] z-0 hidden h-px bg-hairline-2 sm:block"
          />
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative z-[1] flex flex-col items-center gap-2.5 text-center"
            >
              <span className="relative">
                <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-[1.5px] border-hairline-2 bg-background text-foreground">
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {step.icon}
                  </svg>
                </span>
                <span className="absolute -top-1 -right-1 grid h-[23px] w-[23px] place-items-center rounded-full bg-lime font-display text-[12.5px] font-extrabold text-foreground">
                  {i + 1}
                </span>
              </span>
              <b className="font-display text-sm leading-[1.22] font-extrabold tracking-[-0.02em] sm:text-[15px]">
                {step.title}
              </b>
              <p className="text-[12.5px] leading-[1.4] font-medium text-ink-soft sm:text-[13px]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-[34px] flex w-full">
        <Link
          href="/arena"
          className="w-full rounded-[14px] bg-lime px-10 py-[17px] text-center font-display text-base font-extrabold tracking-[-0.02em] text-foreground shadow-[0_10px_26px_-14px_rgb(196_238_31/0.9)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-lime-deep sm:text-lg"
        >
          Explore the Arena →
        </Link>
      </div>

      {/* Sharing is the one honest lever a new creator has: placement clears
          on distinct voters, so more eyes genuinely moves it faster. */}
      <div className="mt-[34px] flex flex-wrap items-center gap-3 rounded-card bg-foreground/[0.035] p-4 sm:gap-4 sm:px-[22px] sm:py-[18px]">
        {arenaFaces.length > 0 ? (
          <span className="flex flex-none">
            {arenaFaces.map((face, i) => (
              <Link
                key={face.id}
                href={`/c/${face.username}`}
                title={`${face.name} — already in the Arena`}
                className={
                  i > 0
                    ? "relative -ml-2.5 block h-[34px] w-[34px] overflow-hidden rounded-full border-2 border-background bg-muted"
                    : "relative block h-[34px] w-[34px] overflow-hidden rounded-full border-2 border-background bg-muted"
                }
              >
                {face.avatarUrl ? (
                  <Image
                    src={face.avatarUrl}
                    alt={face.name}
                    fill
                    sizes="34px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </Link>
            ))}
          </span>
        ) : null}

        <div className="min-w-[180px] flex-1">
          <b className="font-display text-[16.5px] font-extrabold tracking-[-0.02em]">
            Get more eyes on your profile
          </b>
          <p className="mt-0.5 text-sm font-medium text-ink-soft">
            Placement clears faster the more people see your battles.
          </p>
        </div>

        <ShareButton url={profileUrl} label="Copy profile link" />
      </div>
    </div>
  );
}
