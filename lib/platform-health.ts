export type PlatformHealthCheck = {
  id: string;
  name: string;
  status: "healthy" | "warning" | "critical";
  detail: string;
  checkedAt: string;
  responseMs: number;
  configured: boolean;
  expiresAt: string | null;
  available: boolean;
};

export async function runPlatformHealthScan() {
  const checkedAt = new Date().toISOString();
  const checks = await Promise.all([
    checkSupabase(checkedAt),
    checkOpenAi(checkedAt),
    checkStripe(checkedAt),
    checkStripeWebhook(checkedAt),
    checkResend(checkedAt),
    checkApplicationUrl(checkedAt)
  ]);
  const criticalCount = checks.filter((check) => check.status === "critical").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  return { checkedAt, status: criticalCount ? "critical" as const : warningCount ? "degraded" as const : "healthy" as const, criticalCount, warningCount, checks };
}

async function checkSupabase(checkedAt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return missingCheck("supabase", "Database", "Supabase server credentials are not configured.", checkedAt, "critical");
  return runCheck("supabase", "Database", checkedAt, async () => {
    const response = await fetch(`${url}/rest/v1/organisations?select=id&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}.`);
    return "Supabase REST connection is responding.";
  }, "critical", expiry("SUPABASE_SERVICE_ROLE_KEY"));
}

async function checkOpenAi(checkedAt: string) {
  const key = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env.EmpowerNotes_chat_key;
  if (!key) return missingCheck("openai", "AI assistance", "OpenAI server key is not configured.", checkedAt, "warning");
  return runCheck("openai", "AI assistance", checkedAt, async () => {
    const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}.`);
    return "OpenAI authentication is responding; no generation request was made.";
  }, "warning", expiry("OPENAI_API_KEY"));
}

async function checkStripe(checkedAt: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return missingCheck("stripe", "Subscription billing", "Stripe server key is not configured.", checkedAt, "warning");
  return runCheck("stripe", "Subscription billing", checkedAt, async () => {
    const response = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Stripe returned HTTP ${response.status}.`);
    return "Stripe account connection is responding; no payment action was performed.";
  }, "warning", expiry("STRIPE_SECRET_KEY"));
}

// Each inner array is a group where at least one of the listed events must
// be subscribed. Stripe's webhook handler (app/api/stripe/webhook/route.ts)
// accepts both invoice.paid and invoice.payment_succeeded as equivalent, so
// either satisfies that requirement.
const requiredStripeWebhookEventGroups = [
  ["checkout.session.completed"],
  ["customer.subscription.updated"],
  ["customer.subscription.deleted"],
  ["invoice.paid", "invoice.payment_succeeded"],
  ["invoice.payment_failed"]
];

type StripeWebhookEndpoint = {
  url?: string;
  status?: string;
  enabled_events?: string[];
};

type StripeEventDestination = {
  type?: string;
  status?: string;
  enabled_events?: string[];
  webhook_endpoint?: { url?: string | null };
};

type NormalisedEndpoint = { url: string; status: string; events: string[] };

type FetchResult = { endpoints: NormalisedEndpoint[]; fetchError: string };

async function checkStripeWebhook(checkedAt: string): Promise<PlatformHealthCheck> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return missingCheck("stripe-webhook", "Stripe webhook", "Stripe server key is not configured, so webhook delivery cannot be verified.", checkedAt, "warning");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return missingCheck("stripe-webhook", "Stripe webhook", "STRIPE_WEBHOOK_SECRET is missing or malformed. Subscription status updates from Stripe will silently fail signature verification.", checkedAt, "critical");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const expectedPaths = new Set(["https://www.empowernotes.org/api/stripe/webhook", "https://empowernotes.org/api/stripe/webhook", appUrl ? `${appUrl}/api/stripe/webhook` : ""].filter(Boolean).map(normaliseEndpointUrl));
  const primaryEndpoint = [...expectedPaths][0] || "https://www.empowernotes.org/api/stripe/webhook";

  return runCheck("stripe-webhook", "Stripe webhook", checkedAt, async () => {
    const [legacy, modern] = await Promise.all([fetchLegacyWebhookEndpoints(key), fetchEventDestinations(key)]);
    const endpoints = [...legacy.endpoints, ...modern.endpoints];
    const matching = endpoints.filter((endpoint) => expectedPaths.has(normaliseEndpointUrl(endpoint.url)));

    if (!matching.length) {
      const receiver = await verifyLocalWebhookReceiver(primaryEndpoint);
      if (receiver.ok) {
        return "The Stripe webhook receiver is deployed and the signing secret is configured. Stripe's endpoint listing API did not expose the destination to this key, so confirm delivery in Stripe > Developers > Events.";
      }
      const fetchErrors = [legacy.fetchError, modern.fetchError].filter(Boolean);
      const errorSuffix = fetchErrors.length ? ` (Stripe API errors while checking: ${fetchErrors.join(" | ")})` : "";
      throw new Error(`No Stripe webhook endpoint could be confirmed for ${primaryEndpoint}. The deployed receiver returned ${receiver.detail}.${errorSuffix} If one exists in Stripe > Developers > Webhooks, this may be a listing-permission issue with the API key rather than a missing endpoint.`);
    }

    const enabled = matching.find((endpoint) => endpoint.status === "enabled");
    if (!enabled) {
      throw new Error(`A webhook endpoint is registered for the production URL but its status is "${matching[0].status}", not "enabled". Payment confirmations will not be delivered.`);
    }

    const subscribedEvents = new Set(enabled.events.flatMap((event) => normaliseStripeEventName(event)));
    const coversAllEvents = subscribedEvents.has("*");
    const missingGroups = coversAllEvents ? [] : requiredStripeWebhookEventGroups.filter((group) => !group.some((event) => subscribedEvents.has(event)));
    if (missingGroups.length) {
      throw new Error(`The webhook endpoint is enabled but is not subscribed to: ${missingGroups.map((group) => group.join(" or ")).join(", ")}. Add these events in Stripe > Developers > Webhooks so subscription status stays in sync.`);
    }

    return "A Stripe webhook endpoint is enabled for the production URL and subscribed to the required events.";
  }, "critical");
}

// A GET to a POST-only Stripe webhook route should return 405 Method Not
// Allowed. That confirms the route is deployed and reachable even when
// Stripe's endpoint-listing APIs don't expose the destination to this key
// (e.g. a restricted key, or a listing permission gap).
async function verifyLocalWebhookReceiver(endpoint: string) {
  try {
    const response = await fetch(endpoint, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 405) return { ok: true, detail: "HTTP 405 as expected for a POST-only Stripe webhook route." };
    return { ok: false, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "no response" };
  }
}

function normaliseEndpointUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

// Stripe's v2 Event Destinations can report event names prefixed with
// "v1." (e.g. "v1.invoice.paid") for destinations receiving thin events.
// Accept either form so the required-events check still matches.
function normaliseStripeEventName(event: string) {
  return event.startsWith("v1.") ? [event, event.slice(3)] : [event];
}

// The classic v1 API. Endpoints created before Stripe introduced Event
// Destinations (or via direct v1 API calls) show up here, with IDs like we_...
async function fetchLegacyWebhookEndpoints(key: string): Promise<FetchResult> {
  try {
    const response = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=20", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { endpoints: [], fetchError: `v1 list returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` };
    const body = await response.json() as { data?: StripeWebhookEndpoint[] };
    return {
      endpoints: (body.data || [])
        .filter((endpoint): endpoint is StripeWebhookEndpoint & { url: string } => Boolean(endpoint.url))
        .map((endpoint) => ({ url: normaliseEndpointUrl(endpoint.url), status: endpoint.status || "", events: endpoint.enabled_events || [] })),
      fetchError: ""
    };
  } catch (error) {
    return { endpoints: [], fetchError: `v1 list request failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

// Stripe's current dashboard ("Developers > Webhooks > Add destination")
// creates entries through the newer v2 Event Destinations API instead, with
// IDs like ed_... The v1 list above never returns these, so they need to be
// queried separately with their own API version header.
async function fetchEventDestinations(key: string): Promise<FetchResult> {
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (process.env.STRIPE_API_VERSION) headers["Stripe-Version"] = process.env.STRIPE_API_VERSION;
    const response = await fetch("https://api.stripe.com/v2/core/event_destinations?limit=20&include[0]=webhook_endpoint.url", {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { endpoints: [], fetchError: `v2 list returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` };
    const body = await response.json() as { data?: StripeEventDestination[] };
    return {
      endpoints: (body.data || [])
        .filter((destination) => destination.type === "webhook_endpoint" && destination.webhook_endpoint?.url)
        .map((destination) => ({ url: normaliseEndpointUrl(destination.webhook_endpoint?.url || ""), status: destination.status || "", events: destination.enabled_events || [] })),
      fetchError: ""
    };
  } catch (error) {
    return { endpoints: [], fetchError: `v2 list request failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}


async function checkResend(checkedAt: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return missingCheck("resend", "Transactional email", "Resend server key is not configured.", checkedAt, "warning");
  return runCheck("resend", "Transactional email", checkedAt, async () => {
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
    return "Resend connection is responding; no email was sent.";
  }, "warning", expiry("RESEND_API_KEY"));
}

async function checkApplicationUrl(checkedAt: string): Promise<PlatformHealthCheck> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return missingCheck("app-url", "Production URL", "NEXT_PUBLIC_APP_URL is not configured.", checkedAt, "warning");
  const valid = appUrl === "https://www.empowernotes.org" || appUrl === "https://empowernotes.org";
  return { id: "app-url", name: "Production URL", status: valid ? "healthy" : "warning", detail: valid ? `Authentication redirects use ${appUrl}.` : `Authentication redirects currently use ${appUrl}; review the production URL setting.`, checkedAt, responseMs: 0, configured: true, expiresAt: null, available: valid };
}

async function runCheck(id: string, name: string, checkedAt: string, action: () => Promise<string>, failureStatus: "warning" | "critical" = "critical", expiresAt: string | null = null): Promise<PlatformHealthCheck> {
  const startedAt = Date.now();
  try {
    const detail = await action();
    return { id, name, status: expiryWarning(expiresAt) ? "warning" : "healthy", detail: expiryWarning(expiresAt) || detail, checkedAt, responseMs: Date.now() - startedAt, configured: true, expiresAt, available: true };
  } catch (error) {
    return { id, name, status: failureStatus, detail: error instanceof Error ? error.message : `${name} did not respond.`, checkedAt, responseMs: Date.now() - startedAt, configured: true, expiresAt, available: false };
  }
}

function missingCheck(id: string, name: string, detail: string, checkedAt: string, status: "warning" | "critical"): PlatformHealthCheck {
  return { id, name, status, detail, checkedAt, responseMs: 0, configured: false, expiresAt: null, available: false };
}

function expiry(keyName: string) {
  const value = process.env[`${keyName}_EXPIRES_AT`]?.trim();
  return value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
}

function expiryWarning(expiresAt: string | null) {
  if (!expiresAt) return "";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return `Credential expiry date passed ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Rotate and verify it.`;
  if (days <= 30) return `Credential expires in ${days} day${days === 1 ? "" : "s"}. Schedule rotation.`;
  return "";
}
