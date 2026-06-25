import { extractDocumentIntelligence, flagRiskFromDocuments, suggestGoalLinksFromDocuments } from "@/lib/ai-mock";

export function getDocumentIntelligenceDemo() {
  return extractDocumentIntelligence();
}

export function getDocumentGoalSuggestions() {
  return suggestGoalLinksFromDocuments();
}

export function getDocumentRiskFlags(note: string) {
  return flagRiskFromDocuments(note);
}
