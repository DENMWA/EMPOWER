import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthCheck = {
  id: string;
  name: string;
  status: "healthy" | "warning" | "critical";
  detail: string;
  checkedAt: string;
  responseMs: number;
};

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const checkedAt = new Date().toISOString();
  const checks = await Promise.all([
    checkSupabase(checkedAt),
    checkOpenAi(checkedAt),
    checkStripe(checkedAt),
    checkResend(checkedAt),
    checkApplicationUrl(checkedAt)
  ]);
  const criticalCount = checks.filter((check) => check.status === "critical").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;

  return NextResponse.json({
    checkedAt,
    status: criticalCount ? "critical" : warningCount ? "degraded" : "healthy",
    criticalCount,
    warningCount,
    checks
  }, { headers: { "Cache-Control": "no-store" } });
}

async function checkSupabase(checkedAt: string): Promise<HealthCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return missingCheck("supabase", "Database", "Supabase server credentials are not configured.", checkedAt, "critical");

  return runCheck("supabase", "Database", checkedAt, async () => {
    const response = await fetch(`${url}/rest/v1/organisations?select=id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}.`);
    return "Supabase REST connection is responding.";
  });
}

async function checkOpenAi(checkedAt: string): Promise<HealthCheck> {
  const key = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env.EmpowerNotes_chat_key;
  if (!key) return missingCheck("openai", "AI assistance", "OpenAI server key is not configured.", checkedAt, "warning");

  return runCheck("openai", "AI assistance", checkedAt, async () => {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}.`);
    return "OpenAI authentication is responding; no generation request was made.";
  }, "warning");
}

async function checkStripe(checkedAt: string): Promise<HealthCheck> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return missingCheck("stripe", "Subscription billing", "Stripe server key is not configured.", checkedAt, "warning");

  return runCheck("stripe", "Subscription billing", checkedAt, async () => {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Stripe returned HTTP ${response.status}.`);
    return "Stripe account connection is responding; no payment action was performed.";
  }, "warning");
}

async function checkResend(checkedAt: string): Promise<HealthCheck> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return missingCheck("resend", "Transactional email", "Resend server key is not configured.", checkedAt, "warning");

  return runCheck("resend", "Transactional email", checkedAt, async () => {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
    return "Resend connection is responding; no email was sent.";
  }, "warning");
}

async function checkApplicationUrl(checkedAt: string): Promise<HealthCheck> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return missingCheck("app-url", "Production URL", "NEXT_PUBLIC_APP_URL is not configured.", checkedAt, "warning");
  const isProductionDomain = appUrl === "https://www.empowernotes.org" || appUrl === "https://empowernotes.org";

  return {
    id: "app-url",
    name: "Production URL",
    status: isProductionDomain ? "healthy" : "warning",
    detail: isProductionDomain ? `Authentication redirects use ${appUrl}.` : `Authentication redirects currently use ${appUrl}; review the production URL setting.`,
    checkedAt,
    responseMs: 0
  };
}

async function runCheck(id: string, name: string, checkedAt: string, action: () => Promise<string>, failureStatus: "warning" | "critical" = "critical"): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const detail = await action();
    return { id, name, status: "healthy", detail, checkedAt, responseMs: Date.now() - startedAt };
  } catch (error) {
    const detail = error instanceof Error ? error.message : `${name} did not respond.`;
    return { id, name, status: failureStatus, detail, checkedAt, responseMs: Date.now() - startedAt };
  }
}

function missingCheck(id: string, name: string, detail: string, checkedAt: string, status: "warning" | "critical"): HealthCheck {
  return { id, name, status, detail, checkedAt, responseMs: 0 };
}
