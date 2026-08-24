import type { Metadata } from "next";
import { PublicLandingPage, getPublicLandingPageMetadata } from "@/components/seo/PublicLandingPage";
import { getPublicLandingPage } from "@/lib/public-landing-pages";

const page = getPublicLandingPage("support-coordination")!;

export const metadata: Metadata = getPublicLandingPageMetadata(page);

export default function SupportCoordinationPage() {
  return <PublicLandingPage page={page} />;
}
