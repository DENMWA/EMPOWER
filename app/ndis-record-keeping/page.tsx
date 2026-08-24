import type { Metadata } from "next";
import { PublicLandingPage, getPublicLandingPageMetadata } from "@/components/seo/PublicLandingPage";
import { getPublicLandingPage } from "@/lib/public-landing-pages";

const page = getPublicLandingPage("ndis-record-keeping")!;

export const metadata: Metadata = getPublicLandingPageMetadata(page);

export default function NdisRecordKeepingPage() {
  return <PublicLandingPage page={page} />;
}
