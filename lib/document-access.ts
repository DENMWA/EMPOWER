export const workerCareDocumentTypes = [
  "CHAP",
  "Medical Report",
  "Medication Support Plan",
  "Behaviour Support Plan",
  "Risk Assessment",
  "Communication Profile",
  "Occupational Therapy Report",
  "Physiotherapy Report",
  "Speech Pathology Report",
  "Psychology Report",
  "Behaviour Support Practitioner Report",
  "Dietitian Report",
  "Exercise Physiology Report",
  "Podiatry Report",
  "Nursing Assessment Report",
  "Direct Care Implementation Guide"
] as const;

export const protectedDocumentTypes = [
  "NDIS Plan",
  "Service Agreement",
  "Funding Schedule",
  "Plan Budget",
  "SIL Agreement",
  "SDA Agreement",
  "Pricing Agreement",
  "Client Financial Record"
] as const;

const workerCareTypeKeys = new Set<string>(workerCareDocumentTypes.map(normaliseDocumentType));

export function isWorkerCareDocumentType(type: string) {
  return workerCareTypeKeys.has(normaliseDocumentType(type));
}

function normaliseDocumentType(type: string) {
  return type.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
