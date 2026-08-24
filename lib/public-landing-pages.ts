export type PublicLandingPage = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  proofPoints: string[];
  primaryFeatureUrl: string;
  searchIntents: string[];
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const publicLandingPages: PublicLandingPage[] = [
  {
    slug: "ndis-record-keeping",
    title: "NDIS Record Keeping",
    metaTitle: "NDIS Record Keeping Software for Australian Providers",
    description: "Keep NDIS progress notes, incidents, documents, appointments, rosters and invoices organised around each client, house and service.",
    eyebrow: "NDIS record keeping",
    h1: "Clear records for everyday NDIS service delivery",
    intro: "EmpowerNotes gives small providers, sole providers and support teams one calm workspace for the records that matter before reviews, reports and audits.",
    proofPoints: ["Client-specific records", "Admin-controlled access", "Audit-ready downloads", "Australian NDIS workflows"],
    primaryFeatureUrl: "/features/client-records",
    searchIntents: ["NDIS record keeping app", "NDIS documentation software", "disability provider record keeping", "NDIS client records software"],
    sections: [
      { title: "Records stay attached to the right client", body: "Progress notes, documents, appointments, incidents and reports can be organised by client, house or service so information is not mixed across supports." },
      { title: "Managers keep oversight", body: "Authorised admin users can review submitted notes, incident trends, documents, billing evidence and reporting gaps from one operating view." },
      { title: "Workers see what they need", body: "Support workers can focus on their own roster, assigned clients and required documentation without seeing sensitive admin-only areas." }
    ],
    faqs: [
      { question: "Is EmpowerNotes only a note-taking app?", answer: "No. It supports notes, incidents, client records, documents, rostering, appointments, reporting and invoicing workflows." },
      { question: "Can records be separated by organisation?", answer: "Yes. EmpowerNotes is designed around organisation workspaces, role access and client-specific records." }
    ]
  },
  {
    slug: "ndis-support-worker-notes",
    title: "NDIS Support Worker Notes",
    metaTitle: "NDIS Support Worker Notes App",
    description: "Help frontline workers write clearer NDIS shift notes with typed notes, voice transcript support and reviewed AI rephrasing.",
    eyebrow: "Support worker notes",
    h1: "Support notes workers can complete with confidence",
    intro: "EmpowerNotes helps workers turn real shift details into professional records while keeping the worker in control of the final wording.",
    proofPoints: ["Typed or voice input", "Two AI rewrite options", "Worker-approved wording", "Manager review"],
    primaryFeatureUrl: "/features/progress-notes",
    searchIntents: ["NDIS support worker notes", "support worker shift notes app", "AI shift notes NDIS", "disability support notes app"],
    sections: [
      { title: "Better wording without losing the facts", body: "AI-assisted rephrasing supports clarity, objective language and person-centred wording without adding unconfirmed clinical or operational details." },
      { title: "Structured daily support areas", body: "Workers can record community access, personal care, bowel care, meals and fluid logs, appointments and key worker monthly report items." },
      { title: "Simple review before submission", body: "The rewritten note can populate the note pad for review, editing and saving, keeping the worker's judgement central." }
    ],
    faqs: [
      { question: "Does EmpowerNotes write the note for the worker?", answer: "No. It helps improve wording after the worker records what happened." },
      { question: "Can managers review notes?", answer: "Yes. Submitted notes can be reviewed by authorised managers before reporting or export." }
    ]
  },
  {
    slug: "ndis-evidence",
    title: "NDIS Evidence",
    metaTitle: "NDIS Evidence Collection Tool for Support Providers",
    description: "Connect progress notes, documents, incidents, appointments, rosters and billing evidence to support stronger NDIS reporting.",
    eyebrow: "NDIS evidence",
    h1: "Evidence that follows the support delivered",
    intro: "EmpowerNotes helps providers keep everyday service evidence connected to the client, the support delivered and the records needed later.",
    proofPoints: ["Evidence-linked notes", "Document expiry reminders", "Incident follow-up", "Invoice support"],
    primaryFeatureUrl: "/features/audit-reporting",
    searchIntents: ["NDIS evidence collection tool", "NDIS audit evidence software", "support evidence app", "NDIS documentation evidence"],
    sections: [
      { title: "From service delivery to evidence", body: "Notes, incidents, appointments and rostered shifts can support a clearer picture of what happened and what needs follow-up." },
      { title: "Documents stay visible before expiry", body: "Service agreements, CHAP records, medicals and allied health reports can include dates and reminders before expiry." },
      { title: "Billing stays reviewable", body: "Delivered service details can support client-specific invoice preparation while keeping clinical notes away from participant-facing invoices." }
    ],
    faqs: [
      { question: "Can EmpowerNotes replace provider judgement?", answer: "No. It supports evidence organisation and review, while providers remain responsible for compliance decisions." },
      { question: "Can evidence be exported?", answer: "Yes. Authorised users can use download and reporting workflows for reviewed records." }
    ]
  },
  {
    slug: "ndis-compliance",
    title: "NDIS Compliance",
    metaTitle: "NDIS Compliance Documentation Software",
    description: "Support NDIS documentation, incident follow-up, audit packs, expiry reminders and admin oversight without adding unnecessary complexity.",
    eyebrow: "NDIS compliance",
    h1: "A cleaner way to prepare for reviews and audits",
    intro: "EmpowerNotes keeps compliance-facing documentation close to the work, so teams can spot missing records earlier and prepare with less pressure.",
    proofPoints: ["Audit pack support", "Admin-only downloads", "Manager response tracking", "Role-based visibility"],
    primaryFeatureUrl: "/features/audit-reporting",
    searchIntents: ["NDIS compliance software", "NDIS audit preparation software", "NDIS audit ready documentation", "NDIS provider compliance app"],
    sections: [
      { title: "Reduce scattered records", body: "Client records, notes, incidents, documents and reports are grouped around the people and services they belong to." },
      { title: "Keep sensitive actions with managers", body: "Admin users can manage audits, report downloads, incident responses, staff access, client setup and billing oversight." },
      { title: "Show what needs attention", body: "Dashboards and reports help managers see pending note reviews, incident activity, upcoming expiries and service evidence." }
    ],
    faqs: [
      { question: "Is EmpowerNotes an NDIS compliance adviser?", answer: "No. It is software that supports documentation, reporting and operational review." },
      { question: "Can workers access admin compliance areas?", answer: "No. Admin-only areas are intended for authorised users." }
    ]
  },
  {
    slug: "ndis-incident-reporting",
    title: "NDIS Incident Reporting",
    metaTitle: "NDIS Incident Reporting App",
    description: "Record client-specific incidents with incident type templates, property damage, bodily injury, body map markers and manager follow-up.",
    eyebrow: "NDIS incident reporting",
    h1: "Incident reports that are easier to complete and review",
    intro: "EmpowerNotes guides workers through incident details, then gives managers a clear place to respond, follow up and close the loop.",
    proofPoints: ["Incident type templates", "Body map markers", "Property damage support", "Manager response"],
    primaryFeatureUrl: "/features/incident-reporting",
    searchIntents: ["NDIS incident reporting app", "disability incident report software", "client injury body map", "property damage incident report"],
    sections: [
      { title: "Choose the right incident type", body: "Personal injury, property damage, absconding and other incident types can present the relevant template and prompts." },
      { title: "Capture injury context clearly", body: "If bodily injury is relevant, workers can use the body map to mark the area of concern and describe what was observed." },
      { title: "Manager response belongs in admin", body: "Submitted incidents can move to admin for manager response, action tracking and review visibility." }
    ],
    faqs: [
      { question: "Can incident reporting be client specific?", answer: "Yes. Incidents are linked to a client and can also include house or service context." },
      { question: "Can incident reports be downloaded by workers?", answer: "Period downloads are intended for admin users, not the general worker-facing area." }
    ]
  },
  {
    slug: "support-coordination",
    title: "Support Coordination",
    metaTitle: "Support Coordination Documentation Software",
    description: "Give support coordination and provider teams clearer client records, appointment follow-up, documents, reports and service evidence.",
    eyebrow: "Support coordination",
    h1: "A clearer operating record around each client",
    intro: "EmpowerNotes helps coordination-facing teams see client information, documents, appointments and progress patterns without digging through scattered files.",
    proofPoints: ["Client profiles", "Appointment reminders", "Allied health documents", "Progress reports"],
    primaryFeatureUrl: "/features/client-records",
    searchIntents: ["support coordination software", "support coordination documentation", "NDIS client records", "NDIS appointment reminders"],
    sections: [
      { title: "Client context in one place", body: "Profiles can include support needs, contacts, alerts, documents, service agreements and appointment reminders." },
      { title: "Progress patterns become easier to see", body: "Managers can review notes and reports over weekly, monthly, half-yearly and yearly periods." },
      { title: "Documents stay client specific", body: "Medicals, CHAP, allied health reports and agreements can be uploaded against the right client." }
    ],
    faqs: [
      { question: "Is this only for support coordinators?", answer: "No. It can support providers, sole providers, managers and support teams who need clearer client records." },
      { question: "Can appointments be added by workers?", answer: "Yes. Workers and admin can add appointments where their access allows it." }
    ]
  },
  {
    slug: "ndis-rostering-billing",
    title: "NDIS Rostering and Billing",
    metaTitle: "NDIS Rostering and Billing Software",
    description: "Connect client-based rosters, staff availability, delivered shifts, weekly hours and participant invoicing in one NDIS-focused workspace.",
    eyebrow: "Rostering and billing",
    h1: "Roster the work, then review the billing evidence",
    intro: "EmpowerNotes gives managers a practical bridge between scheduled supports, completed services and client-specific invoices.",
    proofPoints: ["Calendar roster", "Staff availability", "Weekly hours totals", "Client invoices"],
    primaryFeatureUrl: "/features/rostering",
    searchIntents: ["NDIS rostering billing software", "NDIS rostering software", "NDIS billing software", "disability support scheduling software"],
    sections: [
      { title: "Roster by staff, client and house", body: "Managers can plan shifts across clients, houses or services, with colour-coded roster states and staff-specific views." },
      { title: "See availability before assigning", body: "Availability forms and replacement recommendations can help managers decide who may be suitable for a shift." },
      { title: "Prepare invoices from reviewed services", body: "Delivered service dates, support items and rates can flow into a reviewable invoice workspace." }
    ],
    faqs: [
      { question: "Can staff see their own roster?", answer: "Yes. Workers can have a private roster view for shifts assigned to them." },
      { question: "Does EmpowerNotes replace existing rostering platforms?", answer: "No. Providers can still use a separate roster platform while using EmpowerNotes for records, evidence and reporting." }
    ]
  },
  {
    slug: "ndis-audit-readiness",
    title: "NDIS Audit Readiness",
    metaTitle: "NDIS Audit Readiness Software",
    description: "Prepare cleaner audit packs, progress reports, incident summaries, document records and evidence exports for NDIS provider reviews.",
    eyebrow: "Audit readiness",
    h1: "Prepare for audits from the work already recorded",
    intro: "EmpowerNotes helps providers turn daily service records into cleaner evidence, reporting and review packs without scrambling at the last minute.",
    proofPoints: ["Audit packs", "Progress summaries", "Incident trends", "Document reminders"],
    primaryFeatureUrl: "/features/audit-reporting",
    searchIntents: ["NDIS audit readiness software", "NDIS audit preparation", "NDIS audit packs", "disability provider audit reporting"],
    sections: [
      { title: "Bring the right records together", body: "Admin-only audit packs can draw from progress notes, incidents, documents, client records and review activity." },
      { title: "Spot gaps before they become pressure", body: "Managers can see pending reviews, incident follow-up, expiry reminders and reporting patterns earlier." },
      { title: "Export with a professional finish", body: "Downloads can include organisation branding, contact details and the relevant reporting period." }
    ],
    faqs: [
      { question: "Can audit packs include reports and incidents?", answer: "Yes. Audit-facing workflows can include reviewed notes, incident information, documents and summaries." },
      { question: "Are private records exposed publicly?", answer: "No. Public SEO pages only describe the product and never expose workspace data." }
    ]
  }
];

export function getPublicLandingPage(slug: string) {
  return publicLandingPages.find((page) => page.slug === slug);
}
