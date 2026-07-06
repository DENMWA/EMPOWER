export type UserRole = "support_worker" | "team_leader" | "case_manager" | "service_manager" | "admin" | "owner" | "sole_provider";
export type ProviderType = "organisation" | "sole_provider";
export type NoteStatus = "Draft" | "Submitted" | "Needs Review" | "Approved" | "Escalated" | "Self-Certified" | "Invoice Ready" | "Locked" | "Not Ready" | "Needs Evidence" | "Sent";

export type Participant = {
  id: string;
  name: string;
  initials: string;
  supportNeeds: string;
  communication: string;
  goals: string[];
  riskAlerts: string[];
  assignedWorkers: string[];
  documents: string[];
};

export type StaffUser = {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  email: string;
  providerType: ProviderType;
  qualityTrend: number[];
  assignedParticipants: string[];
};

export type ProgressNote = {
  id: string;
  participantId: string;
  staffId: string;
  supportDate: string;
  supportType: string;
  roughNote: string;
  finalNote: string;
  voiceTranscript?: string;
  inputMethod: "typed" | "standard_voice" | "guided_voice";
  status: NoteStatus;
  score: number;
  billingEvidenceScore: number;
  missingDetails: string[];
  riskyWordingFlags: string[];
  incidentFlags: string[];
  invoiceReady: boolean;
};

export type SupportDocument = {
  id: string;
  participantId: string;
  type: string;
  status: string;
  visibility: "worker-visible" | "manager-only";
  confidence: number;
  startDate: string;
  expiryDate: string;
};

export const supportTypes = [
  "Community access",
  "Personal care",
  "Bowel care",
  "Incontinence support",
  "Toileting support",
  "Domestic assistance",
  "Appointment support",
  "Meal preparation",
  "Medication prompting",
  "Behaviour support implementation",
  "Key Worker Monthly Report",
  "Youth support",
  "Social work session"
];

export const goalCategories = [
  "Daily living skills",
  "Community participation",
  "Social engagement",
  "Emotional regulation",
  "Communication",
  "Independence",
  "Health and wellbeing",
  "Personal care",
  "Capacity building",
  "Education or employment participation",
  "Behaviour support implementation",
  "Safety and routine",
  "Choice and control"
];

export const sampleGoals = [
  "Build independence with daily living skills",
  "Increase safe community participation",
  "Improve emotional regulation strategies",
  "Strengthen communication and choice-making",
  "Maintain health and wellbeing routines",
  "Develop social engagement confidence"
];

export const participants: Participant[] = [
  {
    id: "amelia-r",
    name: "Amelia R.",
    initials: "AR",
    supportNeeds: "Personal care, communication support, daily routine prompts.",
    communication: "Short clear prompts, visual choices, allow processing time.",
    goals: [sampleGoals[0], sampleGoals[3]],
    riskAlerts: ["Medication prompting requires documentation"],
    assignedWorkers: ["mary-wanjiku", "james-patel"],
    documents: ["Communication Profile", "NDIS Plan", "Occupational Therapy Report"]
  },
  {
    id: "joseph-k",
    name: "Joseph K.",
    initials: "JK",
    supportNeeds: "Community access, emotional regulation, shopping routines.",
    communication: "Calm tone, offer space, confirm choices before transitions.",
    goals: [sampleGoals[1], sampleGoals[2]],
    riskAlerts: ["Community access can trigger distress in busy stores"],
    assignedWorkers: ["mary-wanjiku"],
    documents: ["Behaviour Support Plan", "Risk Assessment"]
  },
  {
    id: "daniel-m",
    name: "Daniel M.",
    initials: "DM",
    supportNeeds: "Youth support, education participation, social engagement.",
    communication: "Collaborative language and strengths-based prompts.",
    goals: [sampleGoals[5]],
    riskAlerts: ["Escalate if absconding risk is observed"],
    assignedWorkers: ["james-patel"],
    documents: ["Case management document"]
  },
  {
    id: "sarah-t",
    name: "Sarah T.",
    initials: "ST",
    supportNeeds: "Domestic assistance, meal preparation, health routines.",
    communication: "Ask permission before assisting and explain each step.",
    goals: [sampleGoals[0], sampleGoals[4]],
    riskAlerts: ["Falls risk in bathroom doorway"],
    assignedWorkers: ["mary-wanjiku", "sarah-collins"],
    documents: ["Risk Assessment", "Mealtime plan"]
  }
];

export const users: StaffUser[] = [
  { id: "dennis-mwangi", name: "Dennis Mwangi", role: "owner", roleLabel: "Provider Owner", email: "dennis@example.com", providerType: "organisation", qualityTrend: [72, 76, 82, 86], assignedParticipants: participants.map((p) => p.id) },
  { id: "mary-wanjiku", name: "Mary Wanjiku", role: "support_worker", roleLabel: "Support Worker", email: "mary@example.com", providerType: "organisation", qualityTrend: [61, 68, 73, 78], assignedParticipants: ["amelia-r", "joseph-k", "sarah-t"] },
  { id: "sarah-collins", name: "Sarah Collins", role: "service_manager", roleLabel: "Service Manager", email: "sarah@example.com", providerType: "organisation", qualityTrend: [78, 81, 83, 88], assignedParticipants: participants.map((p) => p.id) },
  { id: "james-patel", name: "James Patel", role: "team_leader", roleLabel: "Team Leader", email: "james@example.com", providerType: "organisation", qualityTrend: [69, 74, 79, 80], assignedParticipants: ["amelia-r", "daniel-m"] }
];

export const sampleRoughNote =
  "Went with Joseph to shops. He was upset and refused to listen. I helped him calm down and then we bought food. He was ok after.";

export const sampleImprovedNote =
  "Joseph was supported with community access to purchase groceries. During the outing, Joseph presented as distressed and declined staff prompts at that time. Staff maintained a calm tone, allowed space, and followed Joseph's support strategies. Joseph later re-engaged with the activity and completed the grocery purchase. Follow-up is required to monitor triggers during community access and review preferred calming strategies.";

export const progressNotes: ProgressNote[] = [
  {
    id: "note-001",
    participantId: "joseph-k",
    staffId: "mary-wanjiku",
    supportDate: "2026-06-25",
    supportType: "Community access",
    roughNote: sampleRoughNote,
    finalNote: sampleImprovedNote,
    voiceTranscript: sampleRoughNote,
    inputMethod: "standard_voice",
    status: "Needs Review",
    score: 74,
    billingEvidenceScore: 68,
    missingDetails: ["Location", "Exact start and finish time", "Specific follow-up owner"],
    riskyWordingFlags: ["refused to listen"],
    incidentFlags: ["Distress in community setting"],
    invoiceReady: false
  },
  {
    id: "note-002",
    participantId: "sarah-t",
    staffId: "mary-wanjiku",
    supportDate: "2026-06-25",
    supportType: "Domestic assistance",
    roughNote: "Supported kitchen cleaning and meal prep. Sarah chose pasta and helped pack away items.",
    finalNote: "Sarah was supported with domestic assistance and meal preparation. Staff prompted Sarah to choose a meal option, prepare ingredients, and pack away kitchen items. Sarah participated in the task and communicated her preferences throughout the support.",
    inputMethod: "typed",
    status: "Approved",
    score: 86,
    billingEvidenceScore: 82,
    missingDetails: ["Goal link"],
    riskyWordingFlags: [],
    incidentFlags: [],
    invoiceReady: true
  }
];

export const sampleIncident =
  "Participant slipped near the bathroom doorway. No visible injury observed. Staff checked wellbeing, supported the participant to sit safely, notified manager, and monitored presentation.";

export const documents: SupportDocument[] = [
  { id: "doc-001", participantId: "joseph-k", type: "Behaviour Support Plan", status: "Manager verified", visibility: "worker-visible", confidence: 91, startDate: "2026-01-15", expiryDate: "2026-07-20" },
  { id: "doc-002", participantId: "joseph-k", type: "NDIS Plan", status: "AI extracted, awaiting verification", visibility: "manager-only", confidence: 84, startDate: "2025-08-01", expiryDate: "2026-07-12" },
  { id: "doc-003", participantId: "amelia-r", type: "Communication Profile", status: "Manager verified", visibility: "worker-visible", confidence: 93, startDate: "2026-03-01", expiryDate: "2027-03-01" },
  { id: "doc-004", participantId: "sarah-t", type: "Risk Assessment", status: "Manager verified", visibility: "manager-only", confidence: 88, startDate: "2025-06-01", expiryDate: "2026-06-20" },
  { id: "doc-005", participantId: "amelia-r", type: "Service Agreement", status: "Manager verified", visibility: "manager-only", confidence: 89, startDate: "2026-02-10", expiryDate: "2026-07-27" },
  { id: "doc-006", participantId: "sarah-t", type: "CHAP", status: "Manager verified", visibility: "worker-visible", confidence: 90, startDate: "2026-04-05", expiryDate: "2026-08-05" },
  { id: "doc-007", participantId: "amelia-r", type: "Occupational Therapy Report", status: "AI extracted, awaiting verification", visibility: "worker-visible", confidence: 86, startDate: "2026-05-12", expiryDate: "2027-05-12" }
];

export const templates = [
  "Community access",
  "Personal care",
  "Domestic assistance",
  "Transport",
  "Appointment support",
  "Meal preparation",
  "Medication prompting",
  "Social participation",
  "Skill building",
  "Group activities",
  "Youth support",
  "Behaviour support implementation",
  "SIL/residential support",
  "Respite/short-term accommodation",
  "Case management",
  "Social work session notes",
  "Incident report",
  "Shift handover",
  "Support coordination note"
];
