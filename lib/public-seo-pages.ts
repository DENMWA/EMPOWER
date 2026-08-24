export type PublicSeoPage = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  audience: string[];
  searchIntents: string[];
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const publicSeoPages: PublicSeoPage[] = [
  {
    slug: "progress-notes",
    title: "Progress Notes",
    metaTitle: "NDIS Progress Notes Software Australia",
    description: "Create clear, objective NDIS progress notes from typed or voice input, with worker review, manager oversight and audit-ready exports.",
    eyebrow: "NDIS progress notes",
    h1: "Progress notes built for disability support work",
    intro: "EmpowerNotes helps workers turn real shift observations into clear support records while keeping the facts, approval and judgement in human hands.",
    audience: ["Support workers", "Team leaders", "Sole providers", "NDIS disability support providers"],
    searchIntents: ["NDIS progress notes software", "support worker notes app", "disability support shift notes", "AI progress notes for NDIS providers"],
    sections: [
      { title: "Typed, voice and structured notes", body: "Workers can type, dictate or use focused cards for community access, personal care, bowel care, meals and fluid logs, appointments and key worker monthly reporting." },
      { title: "Human-reviewed AI assistance", body: "AI can help rephrase notes for clarity, objectivity and person-centred wording, but workers choose the final wording before saving." },
      { title: "Manager review and reporting", body: "Submitted notes can be reviewed by authorised managers, linked to clients and houses, and used in reporting or audit preparation." }
    ],
    faqs: [
      { question: "Can workers use voice notes?", answer: "Yes. Supported browsers can capture a voice transcript, then the worker reviews and edits the final note before saving." },
      { question: "Does the AI invent clinical details?", answer: "No. EmpowerNotes is designed to improve wording and structure without adding unconfirmed facts." }
    ]
  },
  {
    slug: "incident-reporting",
    title: "Incident Reporting",
    metaTitle: "NDIS Incident Reporting Software for Disability Providers",
    description: "Record client-specific incident reports with injury maps, property damage, notifications, manager response and follow-up tracking.",
    eyebrow: "Incident reporting",
    h1: "Incident reporting that supports action and review",
    intro: "EmpowerNotes gives teams a structured way to capture incidents, preserve immediate actions and keep manager follow-up visible.",
    audience: ["Service managers", "Team leaders", "Support coordinators", "Disability support organisations"],
    searchIntents: ["NDIS incident reporting software", "disability incident report app", "property damage incident report", "client injury body map software"],
    sections: [
      { title: "Incident-specific templates", body: "Personal injury, property damage, absconding and other incident types can guide the user into the right details." },
      { title: "Body map and injury markers", body: "When bodily injury is relevant, the body map helps workers mark the area of concern and describe the injury clearly." },
      { title: "Admin response and closure", body: "Managers can review submitted incidents, add response actions, record follow-up and close the report when appropriate." }
    ],
    faqs: [
      { question: "Can incidents be client specific?", answer: "Yes. Incident reports are linked to the relevant client and can also carry house or service context." },
      { question: "Can reports include property damage?", answer: "Yes. Property damage and bodily injury can both be captured where relevant." }
    ]
  },
  {
    slug: "rostering",
    title: "Rostering",
    metaTitle: "NDIS Rostering Software for Disability Support Teams",
    description: "Plan client-based rosters, staff availability, shift replacement, private worker rosters and weekly hours reporting.",
    eyebrow: "Rostering and scheduling",
    h1: "Rostering connected to clients, houses and service delivery",
    intro: "EmpowerNotes supports a practical roster workflow where managers can plan shifts, review availability and keep worker views private.",
    audience: ["Roster coordinators", "Service managers", "SIL providers", "Community access providers"],
    searchIntents: ["NDIS rostering software", "disability support roster app", "SIL roster software", "staff availability roster software Australia"],
    sections: [
      { title: "Calendar-style rostering", body: "Managers can view weekly, fortnightly and wider roster periods with colour-coded shift states." },
      { title: "Availability and replacement support", body: "Staff availability forms and replacement workflows help managers decide who may be suitable when shifts change." },
      { title: "Worker roster views", body: "Invited workers see only the rostered shifts relevant to them, while managers retain the organisation overview." }
    ],
    faqs: [
      { question: "Does EmpowerNotes replace payroll?", answer: "No. EmpowerNotes supports rostering and service records, but does not perform payroll or award interpretation." },
      { question: "Can floating staff support all clients?", answer: "Yes. Admin can give a staff member all-client operational access without giving admin access." }
    ]
  },
  {
    slug: "billing",
    title: "Billing and Invoicing",
    metaTitle: "NDIS Billing and Invoice Software for Support Providers",
    description: "Prepare client-specific participant invoices from delivered services, service dates, reviewed rates and NDIS support item evidence.",
    eyebrow: "Billing and invoicing",
    h1: "Evidence-linked invoicing for delivered supports",
    intro: "EmpowerNotes helps authorised users move from completed services to reviewed invoices without exposing clinical notes on participant-facing invoices.",
    audience: ["Provider owners", "Finance officers", "Plan-managed service providers", "Sole providers"],
    searchIntents: ["NDIS invoicing software", "NDIS billing software", "support worker invoice app", "participant invoice PDF software"],
    sections: [
      { title: "Client-first invoice workflow", body: "Invoices are prepared for a specific client using delivered services, service dates and approved pricing choices." },
      { title: "NDIS and agreement rate review", body: "Authorised users can review NDIS support codes, service agreement rates or manual rates before generation." },
      { title: "Professional exports", body: "Invoices include natural dates, billing periods, service dates, totals and branded PDF download support." }
    ],
    faqs: [
      { question: "Does EmpowerNotes submit claims to the NDIA?", answer: "No. It helps providers prepare evidence-linked invoices but does not submit claims to the NDIA." },
      { question: "Are invoices client specific?", answer: "Yes. Participant invoicing is client specific and separate from the EmpowerNotes subscription." }
    ]
  },
  {
    slug: "client-records",
    title: "Client Records",
    metaTitle: "NDIS Client Records and Document Management Software",
    description: "Manage client profiles, houses, documents, service agreements, medicals, CHAP records, allied health reports, appointments and reminders.",
    eyebrow: "Client records",
    h1: "Client records organised around real service delivery",
    intro: "EmpowerNotes keeps client information, documents, appointments and reporting context together so workers and managers can find what they need.",
    audience: ["NDIS providers", "Case managers", "House managers", "Sole providers"],
    searchIntents: ["NDIS client records software", "disability client document management", "service agreement expiry reminders", "CHAP document management"],
    sections: [
      { title: "Profiles and house context", body: "Client profiles can include support needs, risk alerts, houses or services, colour-coded reporting and staff access scope." },
      { title: "Documents and expiry reminders", body: "Service agreements, NDIS documents, medicals, CHAP records and allied health reports can be organised by client with expiry reminders." },
      { title: "Appointments and follow-up", body: "Workers or admin can add appointments, while reminders appear as dates approach and follow-up becomes due." }
    ],
    faqs: [
      { question: "Can workers upload documents for a specific client?", answer: "Yes. Documents are attached to a specific client to avoid scattered records." },
      { question: "Can appointment reminders appear automatically?", answer: "Yes. Reminders can appear one week before, two days before, on the day and after overdue follow-up." }
    ]
  },
  {
    slug: "audit-reporting",
    title: "Audit and Reporting",
    metaTitle: "NDIS Audit Ready Reporting Software",
    description: "Review progress notes, incident trends, client reports, audit packs, documents and service evidence across weekly, monthly and longer reporting periods.",
    eyebrow: "Audit and reporting",
    h1: "Reporting that turns service records into operational insight",
    intro: "EmpowerNotes helps managers see the quality, timing and completeness of records before reports, audits and billing reviews.",
    audience: ["Provider owners", "Quality managers", "Service managers", "Team leaders"],
    searchIntents: ["NDIS audit ready documentation", "disability provider reporting software", "incident trend reporting NDIS", "support service audit packs"],
    sections: [
      { title: "Progress and incident trends", body: "Managers can review weekly, monthly, half-yearly and yearly patterns across notes, incidents and service delivery." },
      { title: "Audit packs", body: "Admin-only audit packs bring together relevant records, documents, incidents and review evidence." },
      { title: "Operational oversight", body: "The admin dashboard highlights notes needing review, incident escalations, appointments, invoices and roster items that need attention." }
    ],
    faqs: [
      { question: "Can staff download audit packs?", answer: "No. Audit packs and period downloads are admin functions." },
      { question: "Can reports be client specific?", answer: "Yes. Reporting can be organised around each client and their colour-coded profile." }
    ]
  }
];

export const ndisOperationsPage = {
  title: "NDIS Software Australia",
  metaTitle: "NDIS Operations Software Australia",
  description: "EmpowerNotes is NDIS operations software for Australian disability providers who need progress notes, incident reporting, rostering, client records, appointments, documents and invoicing in one workspace.",
  searchIntents: [
    "NDIS software Australia",
    "NDIS provider operations software",
    "care management software Australia",
    "disability support management software",
    "NDIS compliance documentation software"
  ]
} as const;

export function getPublicSeoPage(slug: string) {
  return publicSeoPages.find((page) => page.slug === slug);
}
