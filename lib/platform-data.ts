export const platformSummary = {
  organisations: 18,
  activeUsers: 146,
  activeClients: 412,
  monthlyRecurringRevenue: "$8,740",
  annualRecurringRevenue: "$104,880",
  failedPayments: 3,
  trialAccounts: 5,
  aiSpendMonth: "$312"
};

export const platformOrganisations = [
  { name: "Harbour Community Supports", plan: "Team", status: "Active", users: 14, clients: 42, renewal: "2026-07-12", mrr: "$490", health: "Good" },
  { name: "Bright Path Care", plan: "Growth", status: "Payment risk", users: 28, clients: 86, renewal: "2026-07-03", mrr: "$890", health: "Watch" },
  { name: "Northside Youth Services", plan: "Team", status: "Trial", users: 9, clients: 24, renewal: "2026-07-18", mrr: "$0", health: "Onboarding" },
  { name: "Mosaic Support Co", plan: "Enterprise", status: "Active", users: 52, clients: 178, renewal: "2026-08-01", mrr: "$2,400", health: "Good" }
];

export const paymentSchedule = [
  { organisation: "Bright Path Care", due: "2026-07-03", amount: "$890", status: "Card retry scheduled" },
  { organisation: "Harbour Community Supports", due: "2026-07-12", amount: "$490", status: "Upcoming" },
  { organisation: "Northside Youth Services", due: "2026-07-18", amount: "$390", status: "Trial conversion" },
  { organisation: "Mosaic Support Co", due: "2026-08-01", amount: "$2,400", status: "Upcoming" }
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
