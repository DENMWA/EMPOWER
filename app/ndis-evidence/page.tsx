import type { Metadata } from "next";
import { PublicLandingPage, getPublicLandingPageMetadata } from "@/components/seo/PublicLandingPage";
import { getPublicLandingPage } from "@/lib/public-landing-pages";

const page = getPublicLandingPage("ndis-evidence")!;

export const metadata: Metadata = getPublicLandingPageMetadata(page);

export default function NdisEvidencePage() {
  return <PublicLandingPage page={page} />;
}
