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

export async function getProgressNoteRewriteOptions(transcript: string) {
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai/improve-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const data = await response.json();

      if (Array.isArray(data?.options) && data.options.length > 0) {
        return data.options as string[];
      }
    } catch {
      // Fall through to local fidelity rewrite so the demo remains usable offline.
    }
  }

  const originalNote = transcript.trim() || "No original shift note entered.";
  const hasJoseph = transcript.toLowerCase().includes("joseph");
  const cleaned = rewritePersonCentredLanguage(originalNote);

  if (hasJoseph) {
    return [
      "Joseph was supported with community access to purchase groceries. During the outing, Joseph became upset and declined staff prompts at that time. Staff supported Joseph to calm and continue the activity, and Joseph later re-engaged with the shopping task and purchased food.",
      "Staff supported Joseph during a community access activity to purchase groceries. The worker recorded that Joseph became upset during the outing and initially declined staff prompts. Staff provided support to help Joseph settle, and Joseph later re-engaged with the activity and completed the grocery purchase.",
      "Joseph attended a community access support activity to purchase groceries. The worker noted that Joseph became upset and declined prompts during the outing. Staff supported Joseph to calm, and Joseph was later able to re-engage and purchase food."
    ];
  }

  return [
    `${cleaned} Staff provided support in line with the documented interaction and recorded the participant's response.`,
    `${cleaned} Staff used objective, person-centred support and documented the participant's presentation, response, and engagement during the shift.`,
    `${cleaned} The record reflects the support provided, the participant's response, and the outcome documented by the worker.`
  ];
}

export async function improveTranscriptToProgressNote(transcript: string) {
  const options = await getProgressNoteRewriteOptions(transcript);
  return options[0] ?? transcript;
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
