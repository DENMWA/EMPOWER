const presentationModeKey = "empowernotes:presentation-mode";
const dataModeKey = "empowernotes:data-mode";

export type DataMode = "demo" | "real";

export function getDataMode(): DataMode {
  if (process.env.NEXT_PUBLIC_PRESENTATION_MODE === "true") return "demo";
  if (typeof window === "undefined") return "demo";

  const stored = window.localStorage.getItem(dataModeKey);
  if (stored === "demo" || stored === "real") return stored;
  return window.localStorage.getItem(presentationModeKey) === "true" ? "demo" : "real";
}

export function setDataMode(mode: DataMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(dataModeKey, mode);
  window.localStorage.setItem(presentationModeKey, String(mode === "demo"));
  window.dispatchEvent(new Event("empowernotes:data-mode-updated"));
}

export function isPresentationModeEnabled() {
  return getDataMode() === "demo";
}

export function isDemoModeEnabled() {
  return getDataMode() === "demo";
}

export function isRealModeEnabled() {
  return getDataMode() === "real";
}

export function setPresentationModeEnabled(enabled: boolean) {
  setDataMode(enabled ? "demo" : "real");
}
