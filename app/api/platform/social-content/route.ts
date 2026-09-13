import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { publishToInstagram } from "@/lib/social-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SocialPost = {
  id: string;
  platform: string;
  feature_slug: string;
  content_text: string;
  image_url: string | null;
  status: string;
  external_post_id: string | null;
  error_detail: string | null;
  scheduled_for: string;
  posted_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Content queue is not configured." }, { status: 503 });

  const response = await fetch(`${url}/rest/v1/social_media_posts?select=id,platform,feature_slug,content_text,image_url,status,external_post_id,error_detail,scheduled_for,posted_at,created_at&order=scheduled_for.desc&limit=30`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: `Content queue could not be loaded (HTTP ${response.status}). Run supabase/social-media-content.sql first.` }, { status: 502 });
  const posts = await response.json() as SocialPost[];
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Content queue is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { action?: string; postId?: string; status?: string };
  if (body.action === "publish_now") {
    if (!body.postId) return NextResponse.json({ error: "postId is required." }, { status: 400 });

    const postResponse = await fetch(`${url}/rest/v1/social_media_posts?select=id,platform,content_text,image_url,status&id=eq.${encodeURIComponent(body.postId)}&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store"
    });
    if (!postResponse.ok) return NextResponse.json({ error: `Content item could not be loaded (HTTP ${postResponse.status}).` }, { status: 502 });

    const posts = await postResponse.json() as Pick<SocialPost, "id" | "platform" | "content_text" | "image_url" | "status">[];
    const post = posts[0];
    if (!post) return NextResponse.json({ error: "Content item was not found." }, { status: 404 });
    if (post.platform !== "instagram") return NextResponse.json({ error: "Only Instagram direct publishing is available from this action." }, { status: 400 });
    if (post.status === "posted") return NextResponse.json({ ok: true, skipped: true, reason: "This Instagram post is already marked posted." });
    if (!post.image_url) return NextResponse.json({ error: "Instagram publishing needs a public image URL." }, { status: 400 });

    const publish = await publishToInstagram(post.image_url, post.content_text);
    const patch = publish.ok
      ? { status: "posted", external_post_id: publish.externalPostId, error_detail: null, posted_at: new Date().toISOString() }
      : { status: "failed", error_detail: publish.error };
    const updateResponse = await fetch(`${url}/rest/v1/social_media_posts?id=eq.${encodeURIComponent(body.postId)}`, {
      method: "PATCH",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!updateResponse.ok) return NextResponse.json({ error: `Instagram result could not be saved (HTTP ${updateResponse.status}).` }, { status: 502 });
    return NextResponse.json({ ok: publish.ok, externalPostId: publish.externalPostId, error: publish.error }, { status: publish.ok ? 200 : 502 });
  }

  if (!body.postId || !["posted", "failed", "draft"].includes(body.status || "")) {
    return NextResponse.json({ error: "postId and a valid status are required." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status: body.status };
  if (body.status === "posted") patch.posted_at = new Date().toISOString();

  const response = await fetch(`${url}/rest/v1/social_media_posts?id=eq.${encodeURIComponent(body.postId)}`, {
    method: "PATCH",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!response.ok) return NextResponse.json({ error: `Update returned HTTP ${response.status}.` }, { status: 502 });
  return NextResponse.json({ ok: true });
}
