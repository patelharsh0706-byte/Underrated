import { z } from "zod";

// Profile v2 — the fixed choices, exactly as in the approved prototype
// (DATABASE.md § Profile v2 fields). Every write is validated against these.

export const HOW = ["Solo", "Small team", "Team"] as const;
export const STAGE = ["Exploring", "Building", "Launched", "Growing"] as const;
/** Optional on purpose — DECISIONS.md § "Onboarding v2". */
export const CAREER = ["Just starting", "1–3 years", "3–5 years", "5–10 years", "10+ years"] as const;
export const MEET = ["Builders", "Founders", "Designers", "Marketers", "Investors", "Potential co-founders", "Anyone interesting"] as const;
export const OPEN_TO = ["🤝 Collaborating", "💼 Open to work", "🧑‍💻 Hiring", "💰 Raising", "💸 Investing", "🛠 Taking clients", "🧪 Looking for beta users", "👋 Just connecting"] as const;
/** Shown first on the Interests step; "+ Show more" reveals the rest. */
export const INTO_POPULAR = ["AI", "SaaS", "Dev tools", "Design", "Open source", "Consumer", "Mobile apps", "Community", "Startups", "Indie hacking"] as const;
export const INTO = [
  ...INTO_POPULAR,
  "AI agents", "Web dev", "No-code", "Marketing", "SEO", "Content", "Video", "Writing", "Crypto", "Trading", "Fintech",
  "E-commerce", "Fitness", "Health", "Productivity", "Education", "Games", "Hardware", "Climate", "Travel", "Music", "Art",
  "Fashion", "Data", "Security", "Real estate", "Sales",
] as const;
export const PAST_STATUS = { live: "🟢 Live", sold: "💰 Sold", sunset: "🌅 Sunset", failed: "💀 Didn’t work out", oss: "⌘ Open source" } as const;
export type PastStatus = keyof typeof PAST_STATUS;

export const LIMITS = { meet: 2, openTo: 3, into: 6, past: 10 } as const;

/** "Wants to meet founders & designers" — lower-case for the chip. */
export function meetPhrase(list: readonly string[]): string | null {
  if (!list.length) return null;
  return list.map((m) => m.toLowerCase()).join(" & ");
}

const optional = <T extends readonly [string, ...string[]]>(list: T) => z.enum(list).nullable().optional();
const url = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.union([z.literal(""), z.url()]));

export const pastProjectSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(40),
  line: z.string().trim().max(80).default(""),
  url: url.default(""),
  // Optional (step 5: "Year (optional)").
  year: z.number().int().min(1990).max(2100).nullable().default(null),
  status: z.enum(Object.keys(PAST_STATUS) as [PastStatus, ...PastStatus[]]),
});

/** Everything a creator can edit on their own profile (and in the onboarding draft). */
export const profileEditSchema = z.object({
  tagline: z.string().trim().max(140).default(""),
  about: z.string().trim().max(200).default(""),
  location: z.string().trim().max(40).default(""),
  locationHidden: z.boolean().default(false),
  projectName: z.string().trim().max(40).default(""),
  projectTagline: z.string().trim().max(80).default(""),
  projectUrl: url.default(""),
  workHow: optional(HOW),
  workStage: optional(STAGE),
  workCareer: optional(CAREER),
  wantsToMeet: z.array(z.enum(MEET)).max(LIMITS.meet, `Up to ${LIMITS.meet}.`).default([]),
  openTo: z.array(z.enum(OPEN_TO)).max(LIMITS.openTo, `Up to ${LIMITS.openTo}.`).default([]),
  into: z.array(z.enum(INTO)).max(LIMITS.into, `Up to ${LIMITS.into}.`).default([]),
  past: z.array(pastProjectSchema).max(LIMITS.past).default([]),
});
export type ProfileEdit = z.output<typeof profileEditSchema>;
