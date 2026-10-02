import { del, list } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { demos } from "@/lib/db/schema";
import { videosToDelete, type StoredVideo } from "@/lib/demos/cleanup";

// Daily Vercel Cron (vercel.json): deletes demo videos that were never paid
// for — DECISIONS.md § 2026-10-01 "Unpaid demo videos are deleted daily".
// Vercel sends `Authorization: Bearer $CRON_SECRET`; nothing else gets in.
// `?dry=1` lists what would go without deleting. Safe to run twice.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isMockMode()) return NextResponse.json({ skipped: "preview mode" });

  const dry = request.nextUrl.searchParams.get("dry") === "1";
  try {
    const videos: StoredVideo[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "demos/", cursor, limit: 1000 });
      videos.push(...page.blobs.map((b) => ({ url: b.url, pathname: b.pathname, uploadedAt: new Date(b.uploadedAt) })));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const rows = await db.select({ videoUrl: demos.videoUrl }).from(demos);
    const doomed = videosToDelete(
      videos,
      rows.map((r) => r.videoUrl),
      new Date(),
    );

    if (!dry && doomed.length) await del(doomed.map((v) => v.url));

    const result = { dry, checked: videos.length, deleted: doomed.map((v) => v.pathname) };
    console.log("demos-cleanup", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error) {
    console.error("demos-cleanup failed", error);
    return NextResponse.json({ error: "Cleanup failed — see logs" }, { status: 500 });
  }
}
