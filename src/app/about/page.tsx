import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Underhyped",
  description: "WTF is Underhyped? The internet discovers people before everyone else does.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          WTF is Underhyped?
        </h1>
        <p className="text-lg font-medium text-foreground">
          Underhyped is where the internet discovers people before everyone else does.
        </p>
      </div>

      <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
        <p>
          There are ridiculously talented people building, designing, writing,
          creating, researching, performing, and making cool shit on the
          internet.
        </p>
        <p>Most of them don&apos;t get nearly enough attention.</p>
        <p className="font-bold text-foreground">We&apos;re trying to change that.</p>
        <p>
          But instead of another feed, follower count, or algorithm deciding
          who you should care about, we do something much simpler:
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border-2 border-foreground bg-card p-4 text-lg font-bold">
        <p>We put two people in front of you.</p>
        <p>
          You decide who&apos;s more <span className="text-aura">underhyped</span>.
        </p>
        <p className="text-muted-foreground">That&apos;s it.</p>
      </div>

      <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
        <p>
          Every battle affects <strong className="text-foreground">Aura</strong>{" "}
          — Underhyped&apos;s community-driven reputation score.
        </p>
        <p>Win battles. Gain Aura. Climb the leaderboard.</p>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border-2 border-foreground bg-card p-4 font-bold">
        <p>Money can&apos;t buy Aura.</p>
        <p>Money can&apos;t buy rank.</p>
        <p>Money can&apos;t make you Main Character.</p>
        <p className="mt-2 text-muted-foreground">The internet has to decide that.</p>
      </div>

      <div className="flex flex-col gap-1 text-lg font-bold tracking-tight">
        <p>Good luck.</p>
        <p className="text-muted-foreground">You&apos;re probably going to need it.</p>
      </div>
    </main>
  );
}
