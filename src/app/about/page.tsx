import type { Metadata } from "next";

import { Scribble } from "@/components/scribble";

export const metadata: Metadata = {
  title: "About — Underhyped",
  description: "WTF is Underhyped? The internet discovers people before everyone else does.",
};

// V2 "document page" treatment — see DESIGN.md § Page Inventory (About:
// "manifesto, three things money doesn't buy") and the mockup's #page-about.
// Every sentence below is ported verbatim from the pre-V2 file; only the
// wrapping markup and classes changed. Cross-checked against the shipped
// copy, not the mockup, wherever the two drifted.
export default function AboutPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-[1060px] flex-1 flex-col px-4 pt-8 pb-16 sm:px-8 sm:pt-10 sm:pb-20">
      <section className="relative pt-6 pb-2 text-center sm:pt-8">
        <p className="mb-3.5 font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          Discover people before everyone else does.
        </p>
        <h1 className="mx-auto max-w-[14ch] text-[clamp(32px,5.4vw,60px)] leading-[0.95] font-black tracking-[-0.045em] text-balance">
          WTF is{" "}
          <span className="relative inline-block px-1.5 text-[#111] before:absolute before:inset-[12%_-10px_6%_-8px] before:-z-10 before:rotate-[-1.1deg] before:bg-lime before:[clip-path:polygon(1%_8%,99%_0%,100%_88%,98%_100%,2%_96%,0%_14%)]">
            Underhyped?
          </span>
        </h1>

        <Scribble side="left" lines={["no algorithm.", "no feed."]} top={76} />
        <Scribble side="right" lines={["just you", "and your", "taste."]} top={34} />
      </section>

      <article className="mx-auto w-full max-w-[660px] pb-2">
        <p className="mb-10 text-center font-display text-[21px] leading-[1.35] font-bold tracking-[-0.02em] text-balance">
          Underhyped is where the internet discovers people before everyone else does.
        </p>

        <div className="text-[16.5px] leading-[1.62] text-ink-soft">
          <p className="mb-4">
            There are ridiculously talented people building, designing, writing,
            creating, researching, performing, and making cool shit on the
            internet.
          </p>
          <p className="mb-4">Most of them don&apos;t get nearly enough attention.</p>
          <p className="mb-4 font-bold text-foreground">We&apos;re trying to change that.</p>
          <p className="mb-4">
            But instead of another feed, follower count, or algorithm deciding
            who you should care about, we do something much simpler:
          </p>
        </div>

        <div className="my-[34px] rounded-card bg-lime px-8 py-[30px] font-display text-[24px] leading-[1.3] font-extrabold tracking-[-0.03em]">
          <p>We put two people in front of you.</p>
          <p>
            You decide who&apos;s more <span className="text-aura">underhyped</span>.
          </p>
          <p className="mt-1.5 text-[rgba(17,17,17,0.55)]">That&apos;s it.</p>
        </div>

        <div className="text-[16.5px] leading-[1.62] text-ink-soft">
          <p className="mb-4">
            Every battle affects <strong className="font-bold text-foreground">Aura</strong>{" "}
            — Underhyped&apos;s community-driven reputation score.
          </p>
          <p className="mb-4">Win battles. Gain Aura. Climb the leaderboard.</p>
        </div>

        <div className="my-[34px] rounded-card bg-card px-[26px] py-6 shadow-card">
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-baseline gap-3 font-display text-[19px] font-bold tracking-[-0.02em]">
              <span className="flex-none text-[16px] text-aura">&times;</span>
              Money can&apos;t buy Aura.
            </li>
            <li className="flex items-baseline gap-3 font-display text-[19px] font-bold tracking-[-0.02em]">
              <span className="flex-none text-[16px] text-aura">&times;</span>
              Money can&apos;t buy rank.
            </li>
            <li className="flex items-baseline gap-3 font-display text-[19px] font-bold tracking-[-0.02em]">
              <span className="flex-none text-[16px] text-aura">&times;</span>
              Money can&apos;t make you Main Character.
            </li>
          </ul>
          <p className="mt-4 text-[15.5px] text-ink-soft">The internet has to decide that.</p>
        </div>

        <p className="mt-9 font-display text-[22px] leading-[1.3] font-extrabold tracking-[-0.03em]">
          Good luck.
          <span className="block text-ink-soft">You&apos;re probably going to need it.</span>
        </p>
      </article>
    </main>
  );
}
