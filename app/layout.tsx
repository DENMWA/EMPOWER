import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://empowernotes.com.au";
const seoDescription =
  "EmpowerNotes is Australian NDIS documentation software for disability support, social work, youth work, and community service providers who need audit-ready progress notes, incident reports, rostering, billing, and client records.";

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
    "disability support progress notes",
    "Australian support worker notes",
    "NDIS incident reporting software",
    "disability service provider software",
    "community access reporting",
    "support coordination documentation",
    "social work case notes Australia",
    "youth work documentation software",
    "NDIS audit evidence"
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
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
