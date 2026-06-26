import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://empowernotes.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/documents",
          "/incidents",
          "/notes",
          "/participants",
          "/platform",
          "/roster"
        ]
      }
    ],
    sitemap: `${appUrl}/sitemap.xml`
  };
}
