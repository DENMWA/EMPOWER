import { plans } from "@/lib/pricing-data";

export const publicProductProfile = {
  name: "EmpowerNotes",
  url: "https://www.empowernotes.org",
  locale: "en-AU",
  market: "Australia",
  category: "NDIS documentation and provider operations software",
  summary: "EmpowerNotes helps Australian disability support providers create clear support records, manage incidents and documents, coordinate services, review evidence, and prepare participant invoices.",
  audience: ["Independent disability support providers", "NDIS support teams", "Multi-site disability service providers"],
  safety: "Empower AI assists with wording, structure and evidence prompts. It does not replace professional judgement, safeguarding decisions, clinical judgement, legal advice or NDIS compliance obligations."
} as const;

export const publicCapabilities = [
  { id: "progress-notes", name: "AI-assisted progress notes", description: "Typed and voice notes can be refined into objective, person-centred records while workers retain control of the final wording.", url: "/ai-progress-notes" },
  { id: "incident-reporting", name: "Incident reporting", description: "Client-specific incident templates support immediate actions, injury mapping, property damage and manager follow-up.", url: "/features#incident-reports" },
  { id: "client-documents", name: "Client document management", description: "Access-controlled client documents, service agreements and expiry reminders remain organised by organisation and client.", url: "/features#client-records" },
  { id: "rostering", name: "Scheduling and rostering", description: "Administrators coordinate houses, services, clients and assigned staff in a shared calendar.", url: "/features" },
  { id: "invoicing", name: "Participant invoicing", description: "Completed supports can be reviewed against approved NDIS, service-agreement or manual rates before invoice generation.", url: "/features" },
  { id: "reporting", name: "Operational reporting", description: "Authorised managers can review service, incident, documentation and progress patterns.", url: "/features#reporting" }
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
    updatedAt: "2026-08-16"
  };
}

export function getLlmsText() {
  const capabilities = publicCapabilities.map((item) => `- [${item.name}](${publicProductProfile.url}${item.url}): ${item.description}`).join("\n");
  const planList = getPublicPlans().map((plan) => `- ${plan.name}: ${plan.price}. ${plan.bestFor}`).join("\n");
  return `# ${publicProductProfile.name}\n\n> ${publicProductProfile.summary}\n\n## Primary audience\n${publicProductProfile.audience.map((item) => `- ${item}`).join("\n")}\n\n## Capabilities\n${capabilities}\n\n## Plans\n${planList}\n\n## Important limitations\n- ${publicProductProfile.safety}\n- Public AI discovery resources never contain participant, client, staff or organisation records.\n- EmpowerNotes is not an NDIS regulator, clinical service or legal adviser.\n\n## Public resources\n- [Features](${publicProductProfile.url}/features)\n- [AI-assisted progress notes](${publicProductProfile.url}/ai-progress-notes)\n- [Pricing](${publicProductProfile.url}/pricing)\n- [Privacy](${publicProductProfile.url}/legal/privacy)\n- [Terms](${publicProductProfile.url}/legal/terms)\n- [Contact](${publicProductProfile.url}/contact)\n- [OpenAPI](${publicProductProfile.url}/openapi.json)\n- [AI manifest](${publicProductProfile.url}/.ai/manifest.json)\n`;
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
    documentation: [`${publicProductProfile.url}/features`, `${publicProductProfile.url}/ai-progress-notes`, `${publicProductProfile.url}/legal/privacy`],
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
