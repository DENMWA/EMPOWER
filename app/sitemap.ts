import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://empowernotes.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.85 },
    { path: "/contact", priority: 0.75 },
    { path: "/signup", priority: 0.7 },
    { path: "/audit-packs", priority: 0.65 }
  ] as const;

  return publicRoutes.map((route) => ({
    url: `${appUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route.priority
  }));
}
