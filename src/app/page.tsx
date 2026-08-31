import { BattleArena } from "@/components/battle/battle-arena";
import { getRandomPair } from "@/lib/db/queries";

// Every visitor needs a fresh random pair — this page must never be
// statically cached at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const pair = await getRandomPair();

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-12 sm:gap-12 sm:py-20">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Who&apos;s more underrated?
        </h1>
        <p className="max-w-md text-muted-foreground">
          Discover people before everyone else does.
        </p>
      </div>

      <BattleArena initialPair={pair} />
    </main>
  );
}
