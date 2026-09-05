import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

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

  const body = await request.json().catch(() => ({})) as { postId?: string; status?: string };
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
