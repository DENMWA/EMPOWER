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

const requiredStripeWebhookEvents = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed"
];

type StripeWebhookEndpoint = {
  url?: string;
  status?: string;
  enabled_events?: string[];
};

async function checkStripeWebhook(checkedAt: string): Promise<PlatformHealthCheck> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return missingCheck("stripe-webhook", "Stripe webhook", "Stripe server key is not configured, so webhook delivery cannot be verified.", checkedAt, "warning");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return missingCheck("stripe-webhook", "Stripe webhook", "STRIPE_WEBHOOK_SECRET is missing or malformed. Subscription status updates from Stripe will silently fail signature verification.", checkedAt, "critical");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const expectedPaths = new Set(["https://www.empowernotes.org/api/stripe/webhook", "https://empowernotes.org/api/stripe/webhook", appUrl ? `${appUrl}/api/stripe/webhook` : ""].filter(Boolean));

  return runCheck("stripe-webhook", "Stripe webhook", checkedAt, async () => {
    const response = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=20", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Stripe returned HTTP ${response.status} while listing webhook endpoints.`);
    const body = await response.json() as { data?: StripeWebhookEndpoint[] };
    const endpoints = body.data || [];
    const matching = endpoints.filter((endpoint) => endpoint.url && expectedPaths.has(endpoint.url));

    if (!matching.length) {
      throw new Error(`No Stripe webhook endpoint is registered for ${[...expectedPaths][0] || "the production URL"}. Subscription status will never update after checkout until one is added in Stripe > Developers > Webhooks.`);
    }

    const enabled = matching.find((endpoint) => endpoint.status === "enabled");
    if (!enabled) {
      throw new Error(`A webhook endpoint is registered for the production URL but its status is "${matching[0].status}", not "enabled". Payment confirmations will not be delivered.`);
    }

    const subscribedEvents = new Set(enabled.enabled_events || []);
    const coversAllEvents = subscribedEvents.has("*");
    const missingEvents = coversAllEvents ? [] : requiredStripeWebhookEvents.filter((event) => !subscribedEvents.has(event));
    if (missingEvents.length) {
      throw new Error(`The webhook endpoint is enabled but is not subscribed to: ${missingEvents.join(", ")}. Add these events in Stripe > Developers > Webhooks so subscription status stays in sync.`);
    }

    return "A Stripe webhook endpoint is enabled for the production URL and subscribed to the required events.";
  }, "critical");
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
