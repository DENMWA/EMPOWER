import type { Metadata } from "next";
import { PublicLandingPage, getPublicLandingPageMetadata } from "@/components/seo/PublicLandingPage";
import { getPublicLandingPage } from "@/lib/public-landing-pages";

const page = getPublicLandingPage("ndis-rostering-billing")!;

export const metadata: Metadata = getPublicLandingPageMetadata(page);

export default function NdisRosteringBillingPage() {
  return <PublicLandingPage page={page} />;
}
