import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { creators } from "@/lib/db/schema";

// Same canonical host as metadataBase in layout.tsx.
const SITE_URL = "https://www.underhyped.wtf";

// Creator profiles are added continuously, so the sitemap can't be a
// build-time snapshot. Hourly is plenty — crawlers don't re-fetch faster.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/arena`, changeFrequency: "always", priority: 0.95 },
    { url: `${SITE_URL}/nominate`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/leaderboard`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/sponsor`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/rules`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/refunds`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const rows = await db
    .select({ username: creators.username, createdAt: creators.createdAt })
    .from(creators);

  const creatorRoutes: MetadataRoute.Sitemap = rows.map((row) => ({
    url: `${SITE_URL}/c/${row.username}`,
    lastModified: row.createdAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...creatorRoutes];
}
