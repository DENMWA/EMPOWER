import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Empower Disability and Social Work",
  description: "AI-assisted documentation and compliance-quality SaaS for disability and community service providers."
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
