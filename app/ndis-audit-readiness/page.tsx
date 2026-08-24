import type { Metadata } from "next";
import { PublicLandingPage, getPublicLandingPageMetadata } from "@/components/seo/PublicLandingPage";
import { getPublicLandingPage } from "@/lib/public-landing-pages";

const page = getPublicLandingPage("ndis-audit-readiness")!;

export const metadata: Metadata = getPublicLandingPageMetadata(page);

export default function NdisAuditReadinessPage() {
  return <PublicLandingPage page={page} />;
}
