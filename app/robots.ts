import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

export default function robots(): MetadataRoute.Robots {
  const privateRoutes = [
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
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes
      },
      {
        userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot"],
        allow: ["/", "/llms.txt", "/.ai/manifest.json", "/openapi.json", "/api/public/capabilities", "/api/mcp"],
        disallow: privateRoutes
      },
      {
        userAgent: ["GPTBot", "CCBot"],
        allow: ["/llms.txt", "/.ai/manifest.json", "/openapi.json", "/api/public/capabilities"],
        disallow: privateRoutes
      }
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl
  };
}
