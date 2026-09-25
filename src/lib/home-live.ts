// Home "Live on Underhyped" tiles — pure, so the delta math is unit-tested.
// Every number comes from getHomeLive(); nothing here is invented (UX rule 10).
// Day boundaries are UTC, same as Daily Heat. "Week" is a rolling 7 × 24h.

export type LiveRange = "today" | "week" | "all";

export interface HomeLiveCounts {
  battles: { today: number; yesterday: number; week: number; prevWeek: number; all: number };
  /** Distinct voter sessions — "people deciding". */
  people: { today: number; yesterday: number; week: number; prevWeek: number; all: number };
  creators: { total: number; newToday: number; newWeek: number };
  nominations: { today: number; week: number; all: number };
}

export interface LiveDelta {
  text: string;
  dir: "up" | "down";
}

export interface LiveTile {
  value: number;
  delta: LiveDelta | null;
}

export interface LiveTiles {
  battles: LiveTile;
  creators: LiveTile;
  people: LiveTile;
  nominations: LiveTile;
}

/** "12% from yesterday". Null when there is no previous number to compare to. */
export function pctDelta(current: number, previous: number, label: string): LiveDelta | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${Math.abs(pct)}% from ${label}`, dir: pct < 0 ? "down" : "up" };
}

/** "5 new today". */
export function newDelta(count: number, label: string): LiveDelta {
  return { text: `${count} new ${label}`, dir: "up" };
}

export function buildLiveTiles(c: HomeLiveCounts, range: LiveRange): LiveTiles {
  if (range === "today") {
    return {
      battles: { value: c.battles.today, delta: pctDelta(c.battles.today, c.battles.yesterday, "yesterday") },
      creators: { value: c.creators.total, delta: newDelta(c.creators.newToday, "today") },
      people: { value: c.people.today, delta: pctDelta(c.people.today, c.people.yesterday, "yesterday") },
      nominations: { value: c.nominations.today, delta: newDelta(c.nominations.today, "today") },
    };
  }
  if (range === "week") {
    return {
      battles: { value: c.battles.week, delta: pctDelta(c.battles.week, c.battles.prevWeek, "last week") },
      creators: { value: c.creators.total, delta: newDelta(c.creators.newWeek, "this week") },
      people: { value: c.people.week, delta: pctDelta(c.people.week, c.people.prevWeek, "last week") },
      nominations: { value: c.nominations.week, delta: newDelta(c.nominations.week, "this week") },
    };
  }
  return {
    battles: { value: c.battles.all, delta: null },
    creators: { value: c.creators.total, delta: null },
    people: { value: c.people.all, delta: null },
    nominations: { value: c.nominations.all, delta: null },
  };
}
