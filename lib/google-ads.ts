"use client";

const googleAdsTagId = "AW-18441446291";
const signupConversionDestination = `${googleAdsTagId}/7OXFCPbCz_ICeJPHyN1E`;
const signupConversionStorageKey = "empowernotes:google-ads-signup-conversion";

type Gtag = (command: "event", eventName: string, parameters: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function trackGoogleAdsSignupConversion(userId: string) {
  if (!userId || typeof window === "undefined" || typeof window.gtag !== "function") return;

  const conversionKey = `${signupConversionStorageKey}:${userId}`;
  if (window.localStorage.getItem(conversionKey) === "sent") return;
  window.localStorage.setItem(conversionKey, "sent");

  window.gtag("event", "conversion", {
    send_to: signupConversionDestination,
    value: 1.0,
    currency: "AUD"
  });
}
