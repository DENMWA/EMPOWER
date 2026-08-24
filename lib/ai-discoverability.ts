import { plans } from "@/lib/pricing-data";
import { publicSeoPages } from "@/lib/public-seo-pages";

export const publicProductProfile = {
  name: "EmpowerNotes",
  url: "https://www.empowernotes.org",
  locale: "en-AU",
  market: "Australia",
  category: "NDIS documentation and provider operations software",
  summary: "EmpowerNotes is Australian NDIS operations software for disability support providers. It helps teams create clear support records, manage incidents, organise client documents, coordinate staff rosters and appointments, review evidence, report on service delivery, and prepare participant invoices.",
  audience: ["Independent disability support providers", "NDIS support teams", "Multi-site disability service providers"],
  safety: "Empower AI assists with wording, structure and evidence prompts. It does not replace professional judgement, safeguarding decisions, clinical judgement, legal advice or NDIS compliance obligations."
} as const;

export const publicCapabilities = [
  { id: "progress-notes", name: "AI-assisted progress notes", description: "Typed and voice notes can be refined into objective, person-centred records while workers retain control of the final wording.", url: "/features/progress-notes" },
  { id: "incident-reporting", name: "Incident reporting", description: "Client-specific incident templates support immediate actions, injury mapping, property damage and manager follow-up.", url: "/features/incident-reporting" },
  { id: "client-documents", name: "Client records and document management", description: "Access-controlled client profiles, documents, service agreements, appointments and expiry reminders remain organised by organisation and client.", url: "/features/client-records" },
  {
    id: "rostering",
    name: "Integrated scheduling and rostering",
    description: "Administrators coordinate client-based shifts, staff assignments and optional houses or service locations in shared calendars, while invited workers privately view their own weekly, fortnightly or monthly roster.",
    url: "/features/rostering",
    highlights: [
      "Client-based and optional house or service-location scheduling",
      "Single-worker and multi-worker shift assignments",
      "Employee availability forms with reviewed AI-assisted extraction",
      "Conflict-aware staff recommendations and secure replacement offers",
      "Private weekly, fortnightly and monthly worker roster views",
      "Completed-hours reporting and linkage from delivered services to invoicing"
    ]
  },
  {
    id: "invoicing",
    name: "Evidence-linked participant invoicing",
    description: "Completed supports flow into a client-first invoice workspace where authorised users review service evidence, NDIS support codes and approved NDIS, service-agreement or manual rates before generating an invoice.",
    url: "/features/billing",
    highlights: [
      "Delivered services populate the client invoice workflow",
      "NDIS support-code and catalogue-rate recommendations remain visible for review",
      "Service-agreement and authorised manual pricing remain available",
      "Evidence, agreement periods, staffing ratios and billing exceptions are checked before generation",
      "Authorised users approve the selected code and exact rate",
      "Participant-facing invoices exclude staff identities and clinical notes"
    ]
  },
  { id: "appointments", name: "Client appointments and reminders", description: "Workers and admin can add client appointments, with reminders appearing as dates approach and follow-up becomes due.", url: "/features/client-records" },
  { id: "reporting", name: "Audit and operational reporting", description: "Authorised managers can review service, incident, documentation, appointment and progress patterns.", url: "/features/audit-reporting" }
] as const;

export const progressNoteFaqs = [
  { question: "Does EmpowerNotes change the facts in a progress note?", answer: "No. The worker remains responsible for the facts and chooses the final wording. Empower AI is designed to improve clarity and structure without inventing events, outcomes or clinical details." },
  { question: "Can workers use voice for progress notes?", answer: "Yes. Supported browsers can capture a voice note for transcription. The worker reviews and edits the text before submitting the final record." },
  { question: "Does AI quality scoring prevent a note from being saved?", answer: "No. Quality feedback is advisory. A worker can save a draft while managers retain the detailed review information needed for their workflow." },
  { question: "Is EmpowerNotes a substitute for professional judgement?", answer: "No. Staff and managers remain responsible for accuracy, safeguarding, escalation, approvals and compliance decisions." }
] as const;

export const publicDataBoundary = {
  included: ["Public product descriptions", "Published subscription plan summaries", "Public capability names", "Public policy and contact links"],
  excluded: ["Participant or client data", "Progress notes and incident records", "Organisation and staff records", "Documents and service agreements", "Authentication, billing and diagnostic internals"]
} as const;

export function getPublicPlans() {
  return plans.map(({ tier, name, price, bestFor, features, href }) => ({ tier, name, price, bestFor, features, url: `${publicProductProfile.url}${href}` }));
}

export function getPublicCapabilitiesPayload() {
  return {
    product: publicProductProfile,
    capabilities: publicCapabilities.map((item) => ({ ...item, url: `${publicProductProfile.url}${item.url}` })),
    plans: getPublicPlans(),
    dataBoundary: publicDataBoundary,
    updatedAt: "2026-08-24"
  };
}

export function getLlmsText() {
  const capabilities = publicCapabilities.map((item) => `- [${item.name}](${publicProductProfile.url}${item.url}): ${item.description}`).join("\n");
  const seoPages = publicSeoPages.map((page) => `- [${page.metaTitle}](${publicProductProfile.url}/features/${page.slug}): ${page.description}`).join("\n");
  const planList = getPublicPlans().map((plan) => `- ${plan.name}: ${plan.price}. ${plan.bestFor}`).join("\n");
  const roster = publicCapabilities.find((item) => item.id === "rostering");
  const rosterDetails = roster && "highlights" in roster ? roster.highlights.map((item) => `- ${item}`).join("\n") : "";
  const invoicing = publicCapabilities.find((item) => item.id === "invoicing");
  const invoicingDetails = invoicing && "highlights" in invoicing ? invoicing.highlights.map((item) => `- ${item}`).join("\n") : "";
  return `# ${publicProductProfile.name}\n\n> ${publicProductProfile.summary}\n\n## Primary audience\n${publicProductProfile.audience.map((item) => `- ${item}`).join("\n")}\n\n## Capabilities\n${capabilities}\n\n## Search-focused public pages\n- [NDIS Operations Software Australia](${publicProductProfile.url}/ndis-software-australia): A wide-angle overview for Australian providers comparing documentation, rostering, reporting, records and billing systems.\n${seoPages}\n\n## Integrated rostering\n${rosterDetails}\n\nRoster recommendations remain advisory and manager controlled. EmpowerNotes does not perform payroll, award interpretation or autonomous roster publication.\n\n## Evidence-linked invoicing\n${invoicingDetails}\n\nEmpowerNotes supports NDIS-aligned evidence and pricing review. It does not submit claims to the NDIA or replace provider verification, plan-manager requirements, accounting advice or NDIS compliance obligations.\n\n## Plans\n${planList}\n\n## Important limitations\n- ${publicProductProfile.safety}\n- Public AI discovery resources never contain participant, client, staff or organisation records.\n- EmpowerNotes is not an NDIS regulator, clinical service or legal adviser.\n\n## Public resources\n- [NDIS operations software Australia](${publicProductProfile.url}/ndis-software-australia)\n- [Features](${publicProductProfile.url}/features)\n- [AI-assisted progress notes](${publicProductProfile.url}/ai-progress-notes)\n- [Pricing](${publicProductProfile.url}/pricing)\n- [Privacy](${publicProductProfile.url}/legal/privacy)\n- [Terms](${publicProductProfile.url}/legal/terms)\n- [Contact](${publicProductProfile.url}/contact)\n- [OpenAPI](${publicProductProfile.url}/openapi.json)\n- [AI manifest](${publicProductProfile.url}/.ai/manifest.json)\n`;
}

export function getAiManifest() {
  return {
    schema_version: "1.0",
    name: publicProductProfile.name,
    description: publicProductProfile.summary,
    canonical_url: publicProductProfile.url,
    locale: publicProductProfile.locale,
    capabilities_url: `${publicProductProfile.url}/api/public/capabilities`,
    openapi_url: `${publicProductProfile.url}/openapi.json`,
    mcp_url: `${publicProductProfile.url}/api/mcp`,
    documentation: [`${publicProductProfile.url}/ndis-software-australia`, `${publicProductProfile.url}/features`, ...publicSeoPages.map((page) => `${publicProductProfile.url}/features/${page.slug}`), `${publicProductProfile.url}/ai-progress-notes`, `${publicProductProfile.url}/legal/privacy`],
    data_policy: publicDataBoundary,
    authentication: { public_discovery: "none", customer_workspace: "required" }
  };
}

export function getOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: { title: "EmpowerNotes Public Discovery API", version: "1.0.0", description: "Privacy-safe public product information only. This API does not expose customer workspaces or participant records." },
    servers: [{ url: publicProductProfile.url }],
    paths: {
      "/api/public/capabilities": {
        get: {
          operationId: "getEmpowerNotesCapabilities",
          summary: "Get public EmpowerNotes product capabilities",
          responses: { "200": { description: "Public product information", content: { "application/json": { schema: { $ref: "#/components/schemas/PublicCapabilities" } } } } }
        }
      },
      "/api/mcp": {
        post: {
          operationId: "callEmpowerNotesPublicMcp",
          summary: "Call the public, read-only EmpowerNotes MCP stub",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "JSON-RPC response" }, "400": { description: "Unsupported or malformed request" } }
        }
      }
    },
    components: {
      schemas: {
        PublicCapabilities: {
          type: "object",
          required: ["product", "capabilities", "plans", "dataBoundary"],
          properties: {
            product: { type: "object" }, capabilities: { type: "array", items: { type: "object" } },
            plans: { type: "array", items: { type: "object" } }, dataBoundary: { type: "object" }, updatedAt: { type: "string", format: "date" }
          }
        }
      }
    }
  };
}
