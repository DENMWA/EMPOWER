"use client";

const googleAdsTagId = "AW-18441446291";
const signupConversionStorageKey = "empowernotes:google-ads-signup-conversion";

type Gtag = (command: "event", eventName: string, parameters: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function trackGoogleAdsSignupConversion(userId: string) {
  const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL;
  if (!conversionLabel || typeof window === "undefined" || typeof window.gtag !== "function") return;

  const conversionKey = `${signupConversionStorageKey}:${userId}`;
  if (window.localStorage.getItem(conversionKey) === "sent") return;
  window.localStorage.setItem(conversionKey, "sent");

  window.gtag("event", "conversion", {
    send_to: `${googleAdsTagId}/${conversionLabel}`
  });
}
