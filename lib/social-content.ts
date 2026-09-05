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

export async function generateSocialCopy(feature: PublicSeoPage, platform: SocialPlatform): Promise<{ text: string; error: string }> {
  if (!openAiApiKey) return { text: localFallbackCopy(feature, platform), error: "" };

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
              "Return JSON only in this shape: {\"text\":\"...\"}. No markdown, no preamble."
            ].join(" ")
          },
          {
            role: "user",
            content: `Feature: ${feature.title}\nDescription: ${feature.description}\nKey points: ${feature.sections.map((section) => `${section.title} — ${section.body}`).join(" | ")}`
          }
        ]
      })
    });
    if (!response.ok) return { text: localFallbackCopy(feature, platform), error: `OpenAI returned HTTP ${response.status}.` };
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content) as { text?: string };
    const text = (parsed.text || "").trim();
    if (!text) return { text: localFallbackCopy(feature, platform), error: "OpenAI returned an empty post." };
    return { text, error: "" };
  } catch (error) {
    return { text: localFallbackCopy(feature, platform), error: error instanceof Error ? error.message : "OpenAI request failed." };
  }
}

function localFallbackCopy(feature: PublicSeoPage, platform: SocialPlatform) {
  const base = `${feature.title}: ${feature.description}`;
  if (platform === "instagram") return `${base}\n\n#NDIS #DisabilitySupport #SupportWorkers #NDISProvider #CareTech`;
  return `${base}\n\nLearn more: https://www.empowernotes.org/features/${feature.slug}`;
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
