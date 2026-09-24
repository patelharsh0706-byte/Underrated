import "./load-env";

import { parseArgs } from "node:util";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { storeCreatorAvatar } from "../src/lib/avatar-store";
import { db } from "../src/lib/db";
import { creators } from "../src/lib/db/schema";

// Moves creator avatars onto our own Blob store — see ARCHITECTURE.md §
// Creator avatars. Run from the operator's machine: it spends that IP's
// unavatar quota (25/day), not the shared quota of a Vercel function.
//
// Usage: npm run avatars:backfill [-- --dry-run] [-- --username <name>]
//
// Safe to re-run: rows already on Blob are skipped. --username refreshes one
// creator even if they are already on Blob (a changed X photo, or upgrading a
// Dicebear fallback once a fetch works).

const { values } = parseArgs({
  options: {
    username: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const dryRun = values["dry-run"];
const isBlobUrl = (url: string | null) => !!url && url.includes(".blob.vercel-storage.com/");

async function main() {
  const rows = await db
    .select({
      id: creators.id,
      username: creators.username,
      avatarUrl: creators.avatarUrl,
      socials: creators.socials,
      primarySocial: creators.primarySocial,
    })
    .from(creators)
    .where(values.username ? eq(creators.username, values.username) : undefined);

  if (values.username && rows.length === 0) {
    console.error(`No creator @${values.username}`);
    process.exit(1);
  }

  const tally = { stored: 0, filled: 0, skipped: 0, unchanged: 0 };

  for (const row of rows) {
    if (isBlobUrl(row.avatarUrl) && !values.username) {
      tally.skipped++;
      continue;
    }

    const socials = (row.socials ?? {}) as Record<string, string>;
    const primaryLink = row.primarySocial ? (socials[row.primarySocial] ?? null) : null;

    if (dryRun) {
      console.log(`@${row.username}: would fetch from ${primaryLink ?? "(no social link)"}`);
      continue;
    }

    const result = await storeCreatorAvatar(primaryLink, row.username);

    if (result.stored) {
      await db.update(creators).set({ avatarUrl: result.url }).where(eq(creators.id, row.id));
      // Only after the row points at the new blob, so a failed delete can
      // leave an orphan file but never a broken avatar.
      if (isBlobUrl(row.avatarUrl)) await del(row.avatarUrl!).catch(() => undefined);
      console.log(`@${row.username}: stored → ${result.url}`);
      tally.stored++;
      continue;
    }

    if (result.rateLimited) {
      const done = tally.stored + tally.filled + tally.unchanged + tally.skipped;
      console.error(
        `@${row.username}: ${result.reason}. Stopping — ${rows.length - done} left; re-run after the quota resets.`,
      );
      break;
    }

    // A failed fetch never replaces a working avatar with Dicebear; it only
    // fills one that is empty, so the card is never blank.
    if (!row.avatarUrl) {
      await db.update(creators).set({ avatarUrl: result.url }).where(eq(creators.id, row.id));
      console.log(`@${row.username}: ${result.reason} — was empty, set to Dicebear`);
      tally.filled++;
    } else {
      console.log(`@${row.username}: ${result.reason} — left unchanged`);
      tally.unchanged++;
    }
  }

  if (!dryRun) {
    console.log(
      `\nDone. stored ${tally.stored} · filled with Dicebear ${tally.filled} · unchanged ${tally.unchanged} · already on Blob ${tally.skipped}`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
