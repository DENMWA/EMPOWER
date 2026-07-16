const presentationModeKey = "empowernotes:presentation-mode";

export function isPresentationModeEnabled() {
  if (process.env.NEXT_PUBLIC_PRESENTATION_MODE === "true") return true;
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(presentationModeKey) === "true";
}

export function setPresentationModeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(presentationModeKey, String(enabled));
}
