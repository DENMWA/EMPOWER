import { publicSeoPages, type PublicSeoPage } from "@/lib/public-seo-pages";

const openAiApiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type SocialPlatform = "linkedin" | "linkedin_page" | "instagram";

// Deterministic daily rotation through the public feature pages, so every
// day of the year lands on the same feature regardless of when the cron
// actually runs (no state needed beyond the date itself).
export function pickFeatureForDate(date: Date): PublicSeoPage {
  const dayOfYear = Math.floor((date.getTime() - new Date(Date.UTC(date.getUTCFullYear(), 0, 0)).getTime()) / 86400000);
  return publicSeoPages[dayOfYear % publicSeoPages.length];
}

const platformBrief: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn personal profile post, professional tone, 100-180 words, no more than 3 relevant hashtags at the end, one clear takeaway, end with a soft question or call to action rather than a hard sell.",
  linkedin_page: "LinkedIn company page post, professional but warmer brand voice, 100-180 words, no more than 3 relevant hashtags at the end, one clear takeaway, end with a soft call to action.",
  instagram: "Instagram caption, punchy and warm tone, 40-90 words, short sentences, line breaks between ideas, end with 5-8 relevant hashtags on their own line."
};

export async function generateSocialCopy(feature: PublicSeoPage, platform: SocialPlatform): Promise<{ text: string; imageLine: string; error: string }> {
  if (!openAiApiKey) return { ...localFallbackCopy(feature, platform), error: "" };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model,
        store: false,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You write daily social media posts for EmpowerNotes, NDIS operations software for Australian disability support providers.",
              "Audience: owners, managers, and support coordinators at small-to-medium NDIS provider organisations.",
              `Platform brief: ${platformBrief[platform]}`,
              "Write about the specific feature described in the user message. Make it feel fresh and different from a generic feature list — pick one angle (a pain point it solves, a before/after, a specific scenario) rather than restating the whole description.",
              "Never invent specific customer names, testimonials, statistics, or claims you cannot verify.",
              "Never use the words 'revolutionary', 'game-changer', 'unlock', or 'supercharge'.",
              "Also write a short 6-12 word line for the accompanying graphic — punchier and shorter than the caption, no hashtags, no emoji.",
              "Return JSON only in this shape: {\"text\":\"...\",\"imageLine\":\"...\"}. No markdown, no preamble."
            ].join(" ")
          },
          {
            role: "user",
            content: `Feature: ${feature.title}\nDescription: ${feature.description}\nKey points: ${feature.sections.map((section) => `${section.title} — ${section.body}`).join(" | ")}`
          }
        ]
      })
    });
    if (!response.ok) return { ...localFallbackCopy(feature, platform), error: `OpenAI returned HTTP ${response.status}.` };
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content) as { text?: string; imageLine?: string };
    const text = (parsed.text || "").trim();
    const imageLine = (parsed.imageLine || "").trim();
    if (!text) return { ...localFallbackCopy(feature, platform), error: "OpenAI returned an empty post." };
    return { text, imageLine: imageLine || feature.description.slice(0, 100), error: "" };
  } catch (error) {
    return { ...localFallbackCopy(feature, platform), error: error instanceof Error ? error.message : "OpenAI request failed." };
  }
}

function localFallbackCopy(feature: PublicSeoPage, platform: SocialPlatform) {
  const base = `${feature.title}: ${feature.description}`;
  const text = platform === "instagram"
    ? `${base}\n\n#NDIS #DisabilitySupport #SupportWorkers #NDISProvider #CareTech`
    : `${base}\n\nLearn more: https://www.empowernotes.org/features/${feature.slug}`;
  return { text, imageLine: feature.description.slice(0, 100) };
}

const imageRatioForPlatform: Record<SocialPlatform, "square" | "wide"> = {
  linkedin: "wide",
  linkedin_page: "wide",
  instagram: "square"
};

export function buildSocialImageUrl(feature: PublicSeoPage, imageLine: string, platform: SocialPlatform) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.empowernotes.org").replace(/\/$/, "");
  const params = new URLSearchParams({ title: feature.title, line: imageLine, ratio: imageRatioForPlatform[platform] });
  return `${appUrl}/social-image?${params.toString()}`;
}

type LinkedInPublishResult = { ok: boolean; externalPostId: string; error: string };

// Personal-profile posting via w_member_social is self-serve (no LinkedIn
// partner approval needed) — see LINKEDIN_SETUP.md for how to obtain
// LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN. Company page posting
// (w_organization_social) requires LinkedIn Marketing Developer Platform
// partner approval and is not wired up here yet.
export async function publishToLinkedInProfile(text: string): Promise<LinkedInPublishResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!accessToken || !personUrn) return { ok: false, externalPostId: "", error: "LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN is not configured." };

  try {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || "202504"
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        author: personUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      })
    });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, externalPostId: "", error: `LinkedIn returned HTTP ${response.status}: ${body.slice(0, 300)}` };
    }
    const postId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id") || "";
    return { ok: true, externalPostId: postId, error: "" };
  } catch (error) {
    return { ok: false, externalPostId: "", error: error instanceof Error ? error.message : "LinkedIn request failed." };
  }
}

type InstagramPublishResult = { ok: boolean; externalPostId: string; error: string };

// Instagram Graph API content publishing is a two-step flow: create a media
// container referencing a public image URL, then publish that container.
// Requires INSTAGRAM_ACCESS_TOKEN (long-lived token for the connected
// Instagram Business account) and INSTAGRAM_BUSINESS_ACCOUNT_ID (defaults to
// the account connected during setup, id 17841435029641998 — override via
// env if the account ever changes).
export async function publishToInstagram(imageUrl: string, caption: string): Promise<InstagramPublishResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "17841435029641998";
  if (!accessToken) return { ok: false, externalPostId: "", error: "INSTAGRAM_ACCESS_TOKEN is not configured." };

  const apiVersion = process.env.META_GRAPH_API_VERSION || "v21.0";
  const graphUrl = `https://graph.facebook.com/${apiVersion}`;

  try {
    const containerResponse = await fetch(`${graphUrl}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken })
    });
    const containerBody = await containerResponse.json() as { id?: string; error?: { message?: string } };
    if (!containerResponse.ok || !containerBody.id) {
      return { ok: false, externalPostId: "", error: `Instagram media creation failed: ${containerBody.error?.message || `HTTP ${containerResponse.status}`}` };
    }

    const publishResponse = await fetch(`${graphUrl}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ creation_id: containerBody.id, access_token: accessToken })
    });
    const publishBody = await publishResponse.json() as { id?: string; error?: { message?: string } };
    if (!publishResponse.ok || !publishBody.id) {
      return { ok: false, externalPostId: "", error: `Instagram publish failed: ${publishBody.error?.message || `HTTP ${publishResponse.status}`}` };
    }

    return { ok: true, externalPostId: publishBody.id, error: "" };
  } catch (error) {
    return { ok: false, externalPostId: "", error: error instanceof Error ? error.message : "Instagram request failed." };
  }
}
