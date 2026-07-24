import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://empowernotes.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "/", priority: 1 },
    { path: "/features", priority: 0.9 },
    { path: "/pricing", priority: 0.85 },
    { path: "/contact", priority: 0.75 },
    { path: "/signup", priority: 0.7 },
    { path: "/legal", priority: 0.55 },
    { path: "/legal/privacy", priority: 0.5 },
    { path: "/legal/terms", priority: 0.5 }
  ] as const;

  return publicRoutes.map((route) => ({
    url: `${appUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route.priority
  }));
}
