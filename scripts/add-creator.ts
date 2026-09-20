import "./load-env";

import { parseArgs } from "node:util";

import { creatorFieldsSchema, type CreatorFields } from "../src/lib/creator-schema";
import { insertCreator, isUsernameTaken } from "../src/lib/db/queries";
import { normalizeToUrlString, resolveSponsorProfile } from "../src/lib/unavatar";

// Admin-only manual add. Goes through the same insertCreator() as a paid
// submission so the avatar, socials shape, and primarySocial are always
// right — inserting rows in the Supabase table editor skips all of that.
// No payment is recorded: this is a comp'd entry, not revenue.
//
// Usage: npm run creator:add -- <workUrl> <x-link-or-@handle> [--name] [--category] [--bio]

const USAGE =
  'Usage: npm run creator:add -- <workUrl> <x-link-or-@handle> [--name "…"] [--category "…"] [--bio "…"]';

const DEFAULT_CATEGORY = "Indie Developer";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" },
    category: { type: "string" },
    bio: { type: "string" },
  },
});

const [workUrlRaw, xRaw] = positionals;
if (!workUrlRaw || !xRaw) {
  console.error(USAGE);
  process.exit(1);
}

const xInput = xRaw.includes("/") ? xRaw : `https://x.com/${xRaw.replace(/^@/, "")}`;
const resolved = resolveSponsorProfile(xInput);
if (!resolved || resolved.socialKey !== "twitter") {
  console.error(`Not an X profile link: ${xRaw}`);
  process.exit(1);
}

const twitterUrl = normalizeToUrlString(xInput)!;
const handle = resolved.suggestedName.replace(/^@/, "");

const parsed = creatorFieldsSchema.safeParse({
  name: values.name ?? handle.replace(/_/g, " "),
  username: resolved.suggestedUsername,
  bio: values.bio,
  category: values.category ?? DEFAULT_CATEGORY,
  workUrl: workUrlRaw,
  socials: { twitter: twitterUrl },
  primarySocial: "twitter",
});

if (!parsed.success) {
  console.error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

async function main(data: CreatorFields) {
  if (await isUsernameTaken(data.username)) {
    console.error(`@${data.username} already exists`);
    process.exit(1);
  }

  const row = await insertCreator(data, { entryFeeCents: null, dodoPaymentId: null });
  if (!row) {
    console.error("Insert returned no row");
    process.exit(1);
  }

  console.log(`Added @${row.username} (${data.name}) — ${data.category}`);
  console.log(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/c/${row.username}`);
  process.exit(0);
}

main(parsed.data).catch((err) => {
  console.error(err);
  process.exit(1);
});
