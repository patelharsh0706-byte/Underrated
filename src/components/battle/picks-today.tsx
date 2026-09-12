"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Today's pick count, shared between the two places the arena block shows it:
 * the pulse row under the battle ("N picks today") and the stats bar below the
 * CTA ("Battles today"). Both used to be server props read once at render, so
 * they sat frozen while the voter kept picking — the number the pick had just
 * moved was the one number on screen that never moved.
 *
 * Seeded from the server on every page render; afterwards `pickWinner` reports
 * the authoritative count back from inside its own transaction, so this never
 * guesses a bump. The Live panel keeps its own 45s poll (see stats-panel.tsx);
 * it converges on the same figure.
 */
const PicksTodayContext = createContext<{
  count: number;
  setCount: (next: number) => void;
} | null>(null);

export function PicksTodayProvider({
  initial,
  children,
}: {
  initial: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initial);

  // Monotonic: a pick that lands while a slower response is still in flight
  // must not be undone by the older, smaller count.
  const publish = useCallback((next: number) => {
    setCount((current) => Math.max(current, next));
  }, []);

  return (
    <PicksTodayContext.Provider value={{ count, setCount: publish }}>
      {children}
    </PicksTodayContext.Provider>
  );
}

/** Inside the provider: the live count. Outside it: the server value passed in. */
export function usePicksToday(fallback: number) {
  const ctx = useContext(PicksTodayContext);
  return ctx?.count ?? fallback;
}

export function usePublishPicksToday() {
  const ctx = useContext(PicksTodayContext);
  return ctx?.setCount;
}
