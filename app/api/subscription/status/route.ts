import { NextResponse } from "next/server";
import { resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { hasSubscriptionWriteAccess } from "@/lib/subscriptions/server-gate";

const billingRoles = new Set(["owner", "admin", "sole_provider", "finance_officer"]);

export async function GET(request: Request) {
  const context = await resolveServerSubscriptionContext(request);
  if (!context.authenticated || context.source !== "supabase") {
    return NextResponse.json({ error: context.resolutionError || "Sign in to view subscription status." }, { status: 401 });
  }

  const subscriptionActive = hasSubscriptionWriteAccess(context.status, context.trialEndsAt, context.graceEndsAt);
  const paymentRequired = !subscriptionActive || context.status === "past_due";

  return NextResponse.json({
    tier: context.tier,
    status: context.status,
    trialEndsAt: context.trialEndsAt,
    currentPeriodEnd: context.currentPeriodEnd,
    graceEndsAt: context.graceEndsAt,
    enforcementMode: context.enforcementMode,
    subscriptionActive,
    paymentRequired,
    canManageBilling: billingRoles.has(context.userRole) || context.permissions.includes("billing.manage"),
    message: getPromptMessage(context.status, context.trialEndsAt, context.graceEndsAt)
  }, { headers: { "Cache-Control": "private, no-store" } });
}

function getPromptMessage(status: string, trialEndsAt: string, graceEndsAt: string) {
  if (status === "trialing" && hasDatePassed(trialEndsAt)) {
    return "Your free trial is complete. Add payment to keep using EmpowerNotes.";
  }
  if (status === "past_due") {
    return hasDatePassed(graceEndsAt)
      ? "Payment is overdue. Add payment to continue using EmpowerNotes."
      : "Payment needs attention. Update billing to keep your workspace active.";
  }
  if (["cancelled", "canceled", "unpaid", "incomplete", "incomplete_expired"].includes(status)) {
    return "This workspace needs an active payment plan to continue.";
  }
  return "";
}

function hasDatePassed(value: string) {
  if (!value) return true;
  const date = new Date(value).getTime();
  return Number.isNaN(date) || date <= Date.now();
}

