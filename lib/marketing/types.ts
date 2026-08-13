export const marketingEventNames = ["page_view", "feature_view", "pricing_view", "signup_started", "signup_completed", "subscription_started"] as const;
export type MarketingEventName = typeof marketingEventNames[number];
export type SourceClass = "openai_ads" | "google_ads" | "organic_search" | "direct" | "referral" | "other_paid" | "other";
export type Attribution = { utmSource:string;utmMedium:string;utmCampaign:string;utmContent:string;utmTerm:string;gclid:string;oppref:string;referrer:string;landingPath:string;sourceClass:SourceClass };
