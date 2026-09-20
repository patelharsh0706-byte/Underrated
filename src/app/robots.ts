import type { MetadataRoute } from "next";

// Same canonical host as metadataBase in layout.tsx.
const SITE_URL = "https://www.underhyped.wtf";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth and post-checkout pages carry nothing worth indexing.
      disallow: ["/api/", "/sign-in", "/submit/success", "/sponsor/success"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
