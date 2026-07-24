export const platformSummary = {
  organisations: 18,
  activeUsers: 146,
  activeClients: 412,
  monthlyRecurringRevenue: "A$3,209.89",
  annualRecurringRevenue: "A$38,518.68",
  failedPayments: 3,
  trialAccounts: 5,
  aiSpendMonth: "$312"
};

export type PlatformOrganisationStatus = "Active" | "Trial" | "Payment risk" | "Suspended" | "Cancelled" | "Locked review";

export type PlatformOrganisation = {
  id: string;
  name: string;
  plan: string;
  status: PlatformOrganisationStatus;
  users: number;
  clients: number;
  renewal: string;
  mrr: string;
  health: string;
  notesCreated: number;
  incidents: number;
  documents: number;
  aiCalls: number;
  lastActive: string;
};

export const platformOrganisations: PlatformOrganisation[] = [
  { id: "harbour-community-supports", name: "Harbour Community Supports", plan: "Practice", status: "Active", users: 14, clients: 42, renewal: "2026-07-12", mrr: "A$129.99", health: "Good", notesCreated: 386, incidents: 9, documents: 54, aiCalls: 224, lastActive: "Today" },
  { id: "bright-path-care", name: "Bright Path Care", plan: "Provider", status: "Payment risk", users: 28, clients: 86, renewal: "2026-07-03", mrr: "A$299.99", health: "Watch", notesCreated: 612, incidents: 18, documents: 88, aiCalls: 472, lastActive: "Today" },
  { id: "northside-youth-services", name: "Northside Youth Services", plan: "Practice", status: "Trial", users: 9, clients: 24, renewal: "2026-07-18", mrr: "A$0", health: "Onboarding", notesCreated: 74, incidents: 3, documents: 19, aiCalls: 61, lastActive: "Yesterday" },
  { id: "mosaic-support-co", name: "Mosaic Support Co", plan: "Enterprise", status: "Active", users: 52, clients: 178, renewal: "2026-08-01", mrr: "A$799.99", health: "Good", notesCreated: 1346, incidents: 44, documents: 165, aiCalls: 1190, lastActive: "Today" }
];

export const paymentSchedule = [
  { organisation: "Bright Path Care", due: "2026-07-03", amount: "A$299.99", status: "Card retry scheduled" },
  { organisation: "Harbour Community Supports", due: "2026-07-12", amount: "A$129.99", status: "Upcoming" },
  { organisation: "Northside Youth Services", due: "2026-07-18", amount: "A$129.99", status: "Trial conversion" },
  { organisation: "Mosaic Support Co", due: "2026-08-01", amount: "A$799.99", status: "Upcoming" }
];

export const diagnosticEvents = [
  { area: "AI notes", event: "2 failed rewrite calls", severity: "Warning", time: "12 min ago" },
  { area: "Document upload", event: "Storage queue healthy", severity: "Healthy", time: "18 min ago" },
  { area: "Billing webhook", event: "1 payment retry webhook delayed", severity: "Watch", time: "42 min ago" },
  { area: "Email reminders", event: "14 expiry reminder emails sent", severity: "Healthy", time: "1 hr ago" }
];

export const analyticsSignals = [
  { label: "Notes created", value: "2,418", change: "+18%" },
  { label: "Voice sessions", value: "684", change: "+24%" },
  { label: "Documents uploaded", value: "326", change: "+12%" },
  { label: "PDF exports", value: "198", change: "+9%" },
  { label: "Roster shifts", value: "1,126", change: "+15%" },
  { label: "Incident reports", value: "74", change: "-6%" }
];

export const featureFlags = [
  { feature: "Guided Voice Documentation", enabled: 16, beta: 2 },
  { feature: "Document AI Reader", enabled: 12, beta: 4 },
  { feature: "Roster Reports", enabled: 9, beta: 3 },
  { feature: "Billing PDF Exports", enabled: 18, beta: 0 }
];
