import type { MetadataRoute } from "next";
import { publicLandingPages } from "@/lib/public-landing-pages";
import { publicSeoPages } from "@/lib/public-seo-pages";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "/", priority: 1 },
    { path: "/features", priority: 0.9 },
    { path: "/ndis-software-australia", priority: 0.93 },
    ...publicLandingPages.map((page) => ({ path: `/${page.slug}`, priority: 0.86 })),
    ...publicSeoPages.map((page) => ({ path: `/features/${page.slug}`, priority: 0.84 })),
    { path: "/ai-progress-notes", priority: 0.92 },
    { path: "/pricing", priority: 0.85 },
    { path: "/contact", priority: 0.75 },
    { path: "/signup", priority: 0.7 },
    { path: "/legal", priority: 0.55 },
    { path: "/legal/privacy", priority: 0.5 },
    { path: "/legal/terms", priority: 0.5 }
  ] as const;

  return publicRoutes.map((route) => ({
    url: `${appUrl}${route.path}`,
    changeFrequency: "weekly" as const,
    priority: route.priority
  }));
}
