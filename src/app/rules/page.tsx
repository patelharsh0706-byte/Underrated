import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules — Underhyped",
  description: "WTF are the rules? Surprisingly simple.",
};

export default function RulesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          WTF are the rules?
        </h1>
        <p className="text-lg font-medium text-foreground">Surprisingly simple.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">01 — Pick who&apos;s more underhyped.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Every battle shows two people.</p>
          <p>Look at what they do.</p>
          <p>Check their work if you want.</p>
          <p>Pick the person you think deserves more attention.</p>
          <p>Don&apos;t overthink it.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">02 — Battles determine Aura.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Everyone enters the arena with the same starting Aura.</p>
          <p>Win battles → Aura goes up.</p>
          <p>Lose battles → Aura goes down.</p>
          <p className="font-bold text-foreground">Aura cannot be purchased.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">03 — Don&apos;t be a d***.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Don&apos;t use bots.</p>
          <p>Don&apos;t automate votes.</p>
          <p>Don&apos;t create fake accounts.</p>
          <p>Don&apos;t manipulate battles.</p>
          <p>Don&apos;t harass people because they&apos;re ranked above you.</p>
          <p>This is supposed to be fun.</p>
          <p>
            Obvious manipulation can result in votes being removed or profiles
            being kicked out.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">04 — Money doesn&apos;t buy hype.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>
            Paying the entry fee gets you{" "}
            <strong className="text-foreground">into the arena</strong>.
          </p>
          <p>That&apos;s all.</p>
          <p>It does not give you:</p>
          <ul className="list-inside list-disc">
            <li>extra Aura</li>
            <li>easier opponents</li>
            <li>more favorable matchmaking</li>
            <li>leaderboard boosts</li>
            <li>Main Character status</li>
          </ul>
          <p>Paid entry and nominated entry are ranked exactly the same way.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">06 — Bring receipts.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Underhyped is about discovering people doing interesting things.</p>
          <p>Link your actual work.</p>
          <p>
            Projects. Music. Writing. Research. Designs. Videos. Companies.
            Open source. Whatever you make.
          </p>
          <p>Give people something worth judging.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">07 — One person. One profile.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Don&apos;t create five versions of yourself.</p>
          <p>That&apos;s weird.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">08 — The Main Character changes.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>
            Main Character is based on current performance, not something you
            can permanently own.
          </p>
          <p>Today&apos;s hero can be tomorrow&apos;s nobody.</p>
          <p className="font-bold text-foreground">Beautiful.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4">
        <h2 className="text-xl font-bold">09 — The internet might disagree with you.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>That&apos;s kind of the point.</p>
          <p>
            Your Aura isn&apos;t an objective measurement of your worth,
            talent, intelligence, attractiveness, employability, or whether
            your parents are proud of you.
          </p>
          <p>It&apos;s a ranking inside a weird internet game.</p>
          <p>Treat it accordingly.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">10 — Have fun.</h2>
        <div className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
          <p>Discover someone interesting.</p>
          <p>Vote for someone nobody knows yet.</p>
          <p>Come back later and say:</p>
        </div>
        <p className="text-lg font-bold tracking-tight">
          &ldquo;WTF. I found them before they were famous.&rdquo;
        </p>
      </div>
    </main>
  );
}
