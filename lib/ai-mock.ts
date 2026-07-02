import { escalationWording } from "@/lib/utils";

export type NoteQuality = {
  auditReadiness: number;
  personCentredLanguage: number;
  objectiveWording: number;
  detailLevel: number;
  goalConnection: "Missing" | "Suggested" | "Linked";
  followUpAction: "Weak" | "Clear";
  riskClarity: number;
  billingEvidenceScore: number;
  improvements: string[];
};

export async function transcribeVoiceNote(blobLabel = "demo voice note") {
  return `Transcript from ${blobLabel}: Went with Joseph to shops. He was upset and refused to listen. I helped him calm down and then we bought food. He was ok after.`;
}

export async function improveTranscriptToProgressNote(transcript: string) {
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai/improve-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const data = await response.json();

      if (data?.note) {
        return data.warning ? `${data.note}\n\nAI service note:\n${data.warning}` : data.note;
      }
    } catch {
      // Fall through to local fidelity rewrite so the demo remains usable offline.
    }
  }

  const originalNote = transcript.trim() || "No original shift note entered.";
  const hasJoseph = transcript.toLowerCase().includes("joseph");
  const professionalRewrite = hasJoseph
    ? [
        "Joseph was supported with community access to purchase groceries. The original note records that Joseph became upset during the outing and declined staff prompts at that time.",
        "",
        "Staff responded by supporting Joseph to calm and continue the activity. Joseph later re-engaged with the shopping task and purchased food. This wording expands the worker's note into a clearer professional record while keeping to the documented facts.",
        "",
        "The note would be stronger if the worker confirms the exact location, support times, specific calming strategy used, Joseph's communication or choice-making, goal link, and any follow-up owner."
      ].join("\n")
    : [
        "The participant was supported with the activity described in the original shift note. The worker's note has been rephrased below using more objective, person-centred language while preserving the documented facts.",
        "",
        rewritePersonCentredLanguage(originalNote),
        "",
        "Before approval, the worker or manager should confirm any missing details such as location, times, support purpose, participant response, risks, notifications, and follow-up actions."
      ].join("\n");

  return [
    "Original shift note preserved:",
    originalNote,
    "",
    "Professional rewrite within documented facts:",
    professionalRewrite,
    "",
    "Clear boundaries for review:",
    "- This rewrite expands the note into a professional structure while staying inside the worker's documented facts.",
    "- Any missing details, such as exact location, times, goal links, injuries, notifications, or follow-up owner, must be confirmed by the worker or manager before approval.",
    "- Suggested language changes are for clarity, person-centred wording, and objective documentation only."
  ].join("\n");
}

export function runGuidedVoiceInterview(answers: string[]) {
  return answers.filter(Boolean).join(" ");
}

export function readNoteAloud(text: string) {
  return `Read-back queued: ${text.slice(0, 120)}... Would you like to approve, edit, add more details, or save as draft?`;
}

export function scoreNoteQuality(): NoteQuality {
  return {
    auditReadiness: 74,
    personCentredLanguage: 9,
    objectiveWording: 8,
    detailLevel: 7,
    goalConnection: "Missing",
    followUpAction: "Weak",
    riskClarity: 7,
    billingEvidenceScore: 68,
    improvements: ["Add exact location and support duration.", "Link the support to a participant goal.", "Clarify who will complete the follow-up action."]
  };
}

export function checkMissingDetails(note: string) {
  const lower = note.toLowerCase();
  return [
    !lower.includes("location") && "Location",
    !lower.includes("follow-up") && "Follow-up action",
    !lower.includes("goal") && "Goal link",
    !/\d/.test(note) && "Date and time",
    !lower.includes("manager") && "Manager notification where required"
  ].filter(Boolean) as string[];
}

export function rewritePersonCentredLanguage(text: string) {
  return text
    .replace(/aggressive/gi, "presented as distressed and raised their voice")
    .replace(/difficult/gi, "needed additional support at that time")
    .replace(/manipulative/gi, "communicated a need in a way staff found unclear")
    .replace(/non-compliant/gi, "declined the prompt at that time")
    .replace(/refused to listen/gi, "declined staff prompts at that time")
    .replace(/attention-seeking/gi, "sought staff attention")
    .replace(/bad behaviour/gi, "behaviour of concern")
    .replace(/lazy/gi, "did not engage with the task at that time")
    .replace(/naughty/gi, "required support to follow the routine")
    .replace(/meltdown/gi, "period of visible distress");
}

export function suggestGoalLinks() {
  return ["Increase safe community participation", "Improve emotional regulation strategies"];
}

export function checkInvoiceReadiness(score: number, approved: boolean, hasGoal: boolean, unresolvedFlags: boolean) {
  const missing = [
    !approved && "Approved, owner-approved, or self-certified record",
    !hasGoal && "Goal or service purpose link",
    score < 75 && "Stronger billing evidence score",
    unresolvedFlags && "Resolve incident flags before invoice evidence use"
  ].filter(Boolean) as string[];
  return {
    status: missing.length ? "Needs Evidence" : "Ready",
    missing,
    evidenceScore: score
  };
}

export function generateInvoiceSummary() {
  return {
    participant: "Joseph K.",
    dateRange: "25 Jun 2026",
    supportType: "Community access",
    totalDuration: "2.0 hours",
    linkedNotes: 1,
    approvalStatus: "Needs Review",
    evidenceScore: 68,
    missingEvidenceItems: ["Goal link", "Approval"],
    unresolvedIncidentFlags: ["Distress in community setting"],
    status: "Needs Evidence"
  };
}

export function extractDocumentIntelligence() {
  return {
    summary: "Plan identifies community participation, emotional regulation, and preferred calming strategies.",
    goals: ["Increase safe community participation", "Improve emotional regulation strategies"],
    risks: ["Busy retail environments may increase distress"],
    supportStrategies: ["Offer space", "Use calm voice", "Confirm choices before transitions"],
    communicationPreferences: ["Short prompts", "Allow processing time"],
    reviewDates: ["2026-09-30"],
    confidenceScore: 84
  };
}

export function suggestGoalLinksFromDocuments() {
  return suggestGoalLinks();
}

export function flagRiskFromDocuments(note: string) {
  return note.toLowerCase().includes("upset") || note.toLowerCase().includes("distressed")
    ? ["Documented plan suggests community distress should be monitored."]
    : [];
}

export function generateIncidentSummary() {
  return {
    summary: "Participant slipped near the bathroom doorway. No visible injury was observed. Staff checked wellbeing, supported the participant to sit safely, notified a manager, and monitored presentation.",
    reviewPrompt: escalationWording,
    managerReviewRequired: true
  };
}

export function generateAuditPack() {
  return {
    participant: "Joseph K.",
    range: "June 2026",
    sections: ["Progress note summary", "Goal progress evidence", "Incident summary", "Manager approval trail", "Document evidence summary", "Invoice-readiness evidence"]
  };
}
