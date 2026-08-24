import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { MarketingAttribution } from "@/components/marketing/MarketingAttribution";
import { JsonLd } from "@/components/seo/JsonLd";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";
const seoDescription =
  "EmpowerNotes is Australian NDIS operations software for disability support providers who need progress notes, incident reporting, rostering, client records, appointment reminders, documents, audit reporting and billing in one workspace.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "EmpowerNotes",
  title: {
    default: "EmpowerNotes | Australian NDIS Documentation Software",
    template: "%s | EmpowerNotes"
  },
  description: seoDescription,
  keywords: [
    "NDIS documentation software Australia",
    "NDIS operations software Australia",
    "NDIS provider management software",
    "disability support progress notes",
    "Australian support worker notes",
    "NDIS incident reporting software",
    "NDIS rostering software",
    "NDIS billing software",
    "NDIS client records software",
    "disability service provider software",
    "community access reporting",
    "support coordination documentation",
    "social work case notes Australia",
    "youth work documentation software",
    "NDIS audit evidence",
    "care management software Australia"
  ],
  creator: "EmpowerNotes",
  publisher: "EmpowerNotes",
  category: "Health and community services software",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "/",
    siteName: "EmpowerNotes",
    title: "EmpowerNotes | Australian NDIS Documentation Software",
    description: seoDescription
  },
  twitter: {
    card: "summary_large_image",
    title: "EmpowerNotes | Australian NDIS Documentation Software",
    description: seoDescription
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  formatDetection: {
    telephone: false
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {})
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publicEntityGraph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${appUrl}/#organization`, name: "EmpowerNotes", url: appUrl, areaServed: { "@type": "Country", name: "Australia" } },
      { "@type": "WebSite", "@id": `${appUrl}/#website`, name: "EmpowerNotes", url: appUrl, inLanguage: "en-AU", publisher: { "@id": `${appUrl}/#organization` } }
    ]
  };
  return (
    <html lang="en-AU">
      <body>
        <JsonLd data={publicEntityGraph} />
        <MarketingAttribution />
        <MaintenanceBanner />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
