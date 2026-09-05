"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Instagram, Linkedin } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

type SocialPost = {
  id: string;
  platform: "linkedin" | "linkedin_page" | "instagram";
  feature_slug: string;
  content_text: string;
  image_url: string | null;
  status: "draft" | "posted" | "failed";
  external_post_id: string | null;
  error_detail: string | null;
  scheduled_for: string;
  posted_at: string | null;
  created_at: string;
};

const platformLabel: Record<SocialPost["platform"], string> = {
  linkedin: "LinkedIn (personal — auto-posts)",
  linkedin_page: "LinkedIn (company page — manual)",
  instagram: "Instagram — manual"
};

export function SocialContentPanel() {
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/platform/social-content", { headers: getAuthenticatedApiHeaders(), cache: "no-store" });
      const body = await response.json() as { posts?: SocialPost[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Content queue could not be loaded.");
      setPosts(body.posts || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Content queue could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markPosted(postId: string) {
    setBusyId(postId);
    await fetch("/api/platform/social-content", {
      method: "POST",
      headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ postId, status: "posted" })
    });
    setBusyId("");
    await load();
  }

  async function copyText(post: SocialPost) {
    await navigator.clipboard.writeText(post.content_text).catch(() => undefined);
    setCopiedId(post.id);
    window.setTimeout(() => setCopiedId(""), 2000);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-700">Daily rotation</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Social content queue</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">LinkedIn (personal profile) auto-posts when configured. LinkedIn company page and Instagram need manual posting until Meta/LinkedIn app review is complete — copy the caption and mark it posted here.</p>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">{error}</p> : null}
      {!posts && !error ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

      <div className="mt-5 space-y-3">
        {posts?.map((post) => (
          <div key={post.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {post.platform === "instagram" ? <Instagram size={16} className="text-slate-500" aria-hidden="true" /> : <Linkedin size={16} className="text-slate-500" aria-hidden="true" />}
                <span className="text-sm font-semibold text-ink">{platformLabel[post.platform]}</span>
                <span className="text-xs text-slate-500">· {post.feature_slug} · {post.scheduled_for}</span>
              </div>
              <StatusBadge label={post.status} tone={post.status === "posted" ? "green" : post.status === "failed" ? "red" : "amber"} />
            </div>
            <div className="mt-3 flex flex-wrap items-start gap-4">
              {post.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt={`${post.feature_slug} social graphic`} className="w-40 rounded-md border border-slate-200" />
              ) : null}
              <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-6 text-slate-700">{post.content_text}</p>
            </div>
            {post.error_detail ? <p className="mt-2 text-xs font-semibold text-red-700">{post.error_detail}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyText(post)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink hover:border-teal-400">
                <Copy size={13} aria-hidden="true" /> {copiedId === post.id ? "Copied" : "Copy caption"}
              </button>
              {post.image_url ? (
                <a href={post.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink hover:border-teal-400">
                  Open image
                </a>
              ) : null}
              {post.status === "draft" ? (
                <button type="button" disabled={busyId === post.id} onClick={() => void markPosted(post.id)} className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50">
                  {busyId === post.id ? "Marking..." : "Mark posted"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {posts && !posts.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">No content generated yet. The daily cron runs at 20:00 UTC.</p> : null}
      </div>
    </Card>
  );
}
