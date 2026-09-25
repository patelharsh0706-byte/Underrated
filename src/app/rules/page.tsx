import type { Metadata } from "next";

import { Scribble } from "@/components/scribble";

export const metadata: Metadata = {
  title: "Rules — Underhyped",
  description: "WTF are the rules? Surprisingly simple.",
};

// V2 "document page" treatment — see DESIGN.md § Page Inventory (Rules:
// "numbered rules list, finale panel") and the mockup's #page-rules. Every
// sentence below is ported verbatim from the pre-V2 file, including its
// number gap (the shipped copy jumps 04 → 06, and closes on 10, not the
// mockup's 09) — that gap is preserved rather than "fixed", since the brief
// forbids touching the wording or sequencing of shipped copy. The eyebrow
// swaps the mockup's "Ten of them. That's all" for DESIGN.md's secondary
// tagline instead, since the real page has nine numbered beats, not ten.
export default function RulesPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-[1060px] flex-1 flex-col px-4 pt-8 pb-16 sm:px-8 sm:pt-10 sm:pb-20">
      <section className="relative pt-6 pb-2 text-center sm:pt-8">
        <p className="mb-3.5 font-display text-[11.5px] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          The internet decides who&apos;s criminally underhyped.
        </p>
        <h1 className="mx-auto max-w-[14ch] text-[clamp(32px,5.4vw,60px)] leading-[0.95] font-black tracking-[-0.045em] text-balance">
          WTF are the{" "}
          <span className="relative inline-block px-1.5 text-[#111] before:absolute before:inset-[12%_-10px_6%_-8px] before:-z-10 before:rotate-[-1.1deg] before:bg-lime before:[clip-path:polygon(1%_8%,99%_0%,100%_88%,98%_100%,2%_96%,0%_14%)]">
            rules?
          </span>
        </h1>

        <Scribble side="left" lines={["surprisingly", "simple."]} top={76} />
        <Scribble side="right" lines={["money buys", "entry.", "nothing else."]} top={34} />
      </section>

      <article className="mx-auto w-full max-w-[660px] pb-2">
        <p className="mb-10 text-center font-display text-[21px] leading-[1.35] font-bold tracking-[-0.02em] text-balance">
          Surprisingly simple.
        </p>

        <div className="flex flex-col">
          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t-0 pt-2 pb-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              01
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                Pick who&apos;s more underhyped.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">Every battle shows two people.</p>
                <p className="mb-1">Look at what they do.</p>
                <p className="mb-1">Check their work if you want.</p>
                <p className="mb-1">Pick the person you think deserves more attention.</p>
                <p>Don&apos;t overthink it.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              02
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                Battles determine Aura.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">Everyone enters the arena with the same starting Aura.</p>
                <p className="mb-1">Win battles → Aura goes up.</p>
                <p className="mb-1">Lose battles → Aura goes down.</p>
                <p className="font-bold text-foreground">Aura cannot be purchased.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              03
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                Don&apos;t be a d***.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">Don&apos;t use bots.</p>
                <p className="mb-1">Don&apos;t automate votes.</p>
                <p className="mb-1">Don&apos;t create fake accounts.</p>
                <p className="mb-1">Don&apos;t manipulate battles.</p>
                <p className="mb-1">Don&apos;t harass people because they&apos;re ranked above you.</p>
                <p className="mb-1">This is supposed to be fun.</p>
                <p>
                  Obvious manipulation can result in votes being removed or profiles
                  being kicked out.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              04
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                Money doesn&apos;t buy hype.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">
                  Paying the entry fee gets you{" "}
                  <strong className="font-bold text-foreground">into the arena</strong>.
                </p>
                <p className="mb-1">That&apos;s all.</p>
                <p className="mb-1">It does not give you:</p>
                <ul className="my-2 flex flex-wrap gap-1.5">
                  <li className="rounded-full border border-hairline bg-card px-3 py-1 text-[13.5px] text-ink-soft">
                    extra Aura
                  </li>
                  <li className="rounded-full border border-hairline bg-card px-3 py-1 text-[13.5px] text-ink-soft">
                    easier opponents
                  </li>
                  <li className="rounded-full border border-hairline bg-card px-3 py-1 text-[13.5px] text-ink-soft">
                    more favorable matchmaking
                  </li>
                  <li className="rounded-full border border-hairline bg-card px-3 py-1 text-[13.5px] text-ink-soft">
                    leaderboard boosts
                  </li>
                  <li className="rounded-full border border-hairline bg-card px-3 py-1 text-[13.5px] text-ink-soft">
                    Main Character status
                  </li>
                </ul>
                <p>Paid entry and nominated entry are ranked exactly the same way.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              06
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                Bring receipts.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">Underhyped is about discovering people doing interesting things.</p>
                <p className="mb-1">Link your actual work.</p>
                <p className="mb-1">
                  Projects. Music. Writing. Research. Designs. Videos. Companies.
                  Open source. Whatever you make.
                </p>
                <p>Give people something worth judging.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              07
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                One person. One profile.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">Don&apos;t create five versions of yourself.</p>
                <p>That&apos;s weird.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              08
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                The Main Character changes.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">
                  Main Character is based on current performance, not something you
                  can permanently own.
                </p>
                <p className="mb-1">Today&apos;s hero can be tomorrow&apos;s nobody.</p>
                <p className="font-bold text-foreground">Beautiful.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[62px_1fr] gap-[22px] border-t border-hairline py-[26px]">
            <span className="font-display text-[26px] leading-[1.1] font-black tracking-[-0.04em] text-ink-faint tabular-nums">
              09
            </span>
            <div>
              <h2 className="mb-2.5 font-display text-[19px] leading-[1.25] font-extrabold tracking-[-0.025em]">
                The internet might disagree with you.
              </h2>
              <div className="text-[15.5px] leading-[1.55] text-ink-soft">
                <p className="mb-1">That&apos;s kind of the point.</p>
                <p className="mb-1">
                  Your Aura isn&apos;t an objective measurement of your worth,
                  talent, intelligence, attractiveness, employability, or whether
                  your parents are proud of you.
                </p>
                <p className="mb-1">It&apos;s a ranking inside a weird internet game.</p>
                <p>Treat it accordingly.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[34px] rounded-card bg-lime px-8 py-[30px]">
          <h2 className="mb-2.5 font-display text-[19px] font-extrabold tracking-[-0.025em]">
            10 — Have fun.
          </h2>
          <div className="text-[15.5px] leading-[1.55] text-[rgba(17,17,17,0.72)]">
            <p className="mb-1">Discover someone interesting.</p>
            <p className="mb-1">Vote for someone nobody knows yet.</p>
            <p className="mb-1">Come back later and say:</p>
          </div>
          <p className="mt-4 font-display text-[22px] leading-[1.3] font-extrabold tracking-[-0.03em] text-foreground">
            &ldquo;WTF. I found them before they were famous.&rdquo;
          </p>
        </div>
      </article>
    </main>
  );
}
