export const askEmpowerRefusal =
  "I can only help with EmpowerNotes features, records, workflows and setup. Please ask me something about using the app.";

export const askEmpowerKnowledge = [
  "EmpowerNotes is an Australian NDIS operations workspace for disability support providers.",
  "Core areas include dashboard, progress notes, client profiles, my roster, incidents, documents, handover, admin and platform owner console.",
  "Workers can create progress notes, use voice input where available, use AI rewrite options, save notes, view assigned clients, view their own roster and complete incident reports.",
  "Progress note AI must preserve the worker's original facts and should not invent details, diagnoses, outcomes, times or notifications.",
  "Admins manage clients, staff invites, houses or services, scheduling, rostering, incident review, documents, reporting, audit packs, billing and plan settings.",
  "Admin access is role and permission controlled. Staff should only see the features assigned to their role and house or service scope.",
  "Client records are organisation-specific. Workers choose a house or service first so only relevant clients appear for notes, incidents and appointments.",
  "Roster tools support calendar-style planning, shift assignment, staff availability, vacant and cancelled shifts, replacement suggestions, sign-in/sign-off, weekly hours and PDF export.",
  "Appointments can be added by workers or admin, linked to a client and house or service, shown as reminders, reviewed after completion and reopened later if needed.",
  "Incident reports are client and house specific. Incident types include personal injury, property damage, absconding and other reportable events. A body map can be used when injury is involved.",
  "Admin reviews incident reports, records manager responses and uses incident charts to compare submitted and actioned incidents by client.",
  "Documents are uploaded for a specific client to avoid mixed files. Document categories include NDIS agreements, service agreements, medicals, CHAP and allied health reports.",
  "Agreement records can include start date, expiry date and reminders one month and two weeks before expiry.",
  "Billing is admin-only. Invoices are client-specific, date-aware and can include evidence-linked services from completed supports.",
  "Organisation branding can include logo and contact details on downloadable reports where enabled.",
  "The developer platform console is separate from the client-facing workspace and is for platform-owner monitoring, diagnostics, analytics, subscriptions and support.",
  "Ask Empower is an in-app assistant. It must answer only questions about EmpowerNotes use, setup and workflow decisions."
].join("\n");

const appScopeTerms = [
  "empower",
  "empowernotes",
  "app",
  "dashboard",
  "admin",
  "worker",
  "staff",
  "manager",
  "client",
  "participant",
  "house",
  "service",
  "progress note",
  "shift note",
  "incident",
  "roster",
  "rostering",
  "shift",
  "availability",
  "appointment",
  "document",
  "medical",
  "chap",
  "agreement",
  "report",
  "audit",
  "invoice",
  "billing",
  "subscription",
  "pricing",
  "sign in",
  "password",
  "invite",
  "role",
  "permission",
  "download",
  "save",
  "supabase",
  "stripe",
  "vercel",
  "ndis"
];

const outsideScopeTerms = [
  "recipe",
  "homework",
  "essay",
  "weather",
  "sports",
  "stock",
  "investment",
  "diagnose me",
  "treatment plan",
  "legal advice",
  "write code",
  "programming",
  "dating",
  "movie",
  "song"
];

export function isAskEmpowerQuestionInScope(question: string) {
  const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (outsideScopeTerms.some((term) => normalized.includes(term)) && !appScopeTerms.some((term) => normalized.includes(term))) return false;
  return appScopeTerms.some((term) => normalized.includes(term)) || normalized.length < 80;
}

