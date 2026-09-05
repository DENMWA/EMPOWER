import { NextResponse } from "next/server";
import { buildSocialImageUrl, generateSocialCopy, pickFeatureForDate, publishToLinkedInProfile, type SocialPlatform } from "@/lib/social-content";
import type { PublicSeoPage } from "@/lib/public-seo-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platforms: SocialPlatform[] = ["linkedin", "linkedin_page", "instagram"];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised scheduled content request." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Content queue storage is not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  const today = new Date();
  const scheduledFor = today.toISOString().slice(0, 10);
  const feature = pickFeatureForDate(today);

  const results = await Promise.all(platforms.map((platform) => processPlatform(url, headers, platform, feature, scheduledFor)));
  return NextResponse.json({ scheduledFor, featureSlug: feature.slug, results });
}

async function processPlatform(url: string, headers: Record<string, string>, platform: SocialPlatform, feature: PublicSeoPage, scheduledFor: string) {
  const existingResponse = await fetch(`${url}/rest/v1/social_media_posts?select=id,status&platform=eq.${platform}&scheduled_for=eq.${scheduledFor}&limit=1`, { headers, cache: "no-store" });
  if (!existingResponse.ok) return { platform, action: "error", error: `Existing-row check returned HTTP ${existingResponse.status}.` };
  const existing = await existingResponse.json() as Array<{ id: string; status: string }>;
  if (existing[0]) return { platform, action: "skipped", reason: `Already ${existing[0].status} for today.` };

  const generated = await generateSocialCopy(feature, platform);
  const imageUrl = buildSocialImageUrl(feature, generated.imageLine, platform);

  const insertBody: Record<string, unknown> = {
    platform,
    feature_slug: feature.slug,
    content_text: generated.text,
    image_url: imageUrl,
    status: "draft",
    scheduled_for: scheduledFor,
    error_detail: generated.error || null
  };

  if (platform === "linkedin") {
    const publish = await publishToLinkedInProfile(generated.text);
    if (publish.ok) {
      insertBody.status = "posted";
      insertBody.external_post_id = publish.externalPostId;
      insertBody.posted_at = new Date().toISOString();
    } else {
      insertBody.status = "failed";
      insertBody.error_detail = publish.error;
    }
  }

  const insertResponse = await fetch(`${url}/rest/v1/social_media_posts`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(insertBody) });
  if (!insertResponse.ok) return { platform, action: "error", error: `Insert returned HTTP ${insertResponse.status}.` };
  return { platform, action: "created", status: insertBody.status };
}
