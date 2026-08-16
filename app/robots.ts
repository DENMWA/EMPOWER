import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api",
          "/admin",
          "/audit-packs",
          "/auth",
          "/dashboard",
          "/documents",
          "/handover",
          "/incidents",
          "/my-roster",
          "/notes",
          "/participants",
          "/platform",
          "/reset-password",
          "/roster",
          "/support",
          "/trial"
        ]
      }
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl
  };
}
