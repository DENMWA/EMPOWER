import { NextResponse } from "next/server";
import { fullAdminRoles } from "@/lib/admin-permissions";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recordClasses = new Set(["care_records", "incident_records", "restrictive_practice_records", "billing_records", "document_records", "workforce_records"]);
const proposedActions = new Set(["review", "deidentify", "delete"]);
type SecureContext = { response: NextResponse | null; url: string; organisationId: string; userId: string; headers: Record<string, string> };

export async function GET(request: Request) {
  const context = await secureContext(request);
  if (context.response) return context.response;
  const query = (table: string, select: string, order = "created_at.desc") => fetch(`${context.url}/rest/v1/${table}?select=${select}&organisation_id=eq.${context.organisationId}&order=${order}`, { headers: context.headers, cache: "no-store" });
  const [schedules, holds, queue, jobs, participants] = await Promise.all([
    query("retention_schedules", "*", "record_class.asc"),
    query("legal_holds", "*"),
    query("retention_review_queue", "*", "eligible_at.asc"),
    query("retention_action_jobs", "*"),
    query("participants_or_clients", "id,name,status", "name.asc")
  ]);
  if ([schedules, holds, queue, jobs, participants].some((response) => !response.ok)) return NextResponse.json({ error: "Data lifecycle records could not be loaded." }, { status: 502 });
  return NextResponse.json({
    schedules: await schedules.json(),
    holds: await holds.json(),
    queue: await queue.json(),
    jobs: await jobs.json(),
    participants: await participants.json(),
    executionEnabled: false
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await secureContext(request);
  if (context.response) return context.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "save_schedule") {
    const recordClass = String(body.recordClass || "");
    const proposedAction = String(body.proposedAction || "");
    const status = String(body.status || "");
    const years = Number(body.retentionYears);
    if (!recordClasses.has(recordClass) || !proposedActions.has(proposedAction) || !["draft", "approved", "paused"].includes(status) || !Number.isInteger(years) || years < 1 || years > 30) {
      return NextResponse.json({ error: "Enter a valid retention schedule." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const response = await fetch(`${context.url}/rest/v1/retention_schedules?on_conflict=organisation_id,record_class`, {
      method: "POST",
      headers: { ...context.headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ organisation_id: context.organisationId, record_class: recordClass, retention_years: years, proposed_action: proposedAction, status, basis: String(body.basis || "").trim(), basis_url: String(body.basisUrl || "").trim(), approved_by: status === "approved" ? context.userId : null, approved_at: status === "approved" ? now : null, updated_at: now })
    });
    if (!response.ok) return databaseError(response, "The retention schedule could not be saved.");
    await audit(context, "retention_schedule_updated", "retention_schedule", null, { recordClass, years, proposedAction, status });
    return NextResponse.json({ ok: true });
  }

  if (action === "create_hold") {
    const reason = String(body.reason || "").trim();
    const participantId = String(body.participantId || "").trim() || null;
    const recordClass = String(body.recordClass || "").trim() || null;
    if (reason.length < 10 || (recordClass && !recordClasses.has(recordClass))) return NextResponse.json({ error: "Add a clear hold reason and valid scope." }, { status: 400 });
    if (participantId && !(await participantBelongsToOrganisation(context, participantId))) return NextResponse.json({ error: "The selected client is outside this workspace." }, { status: 403 });
    const response = await fetch(`${context.url}/rest/v1/legal_holds`, { method: "POST", headers: { ...context.headers, Prefer: "return=representation" }, body: JSON.stringify({ organisation_id: context.organisationId, participant_id: participantId, record_class: recordClass, reason, reference: String(body.reference || "").trim(), review_on: body.reviewOn || null, created_by: context.userId }) });
    if (!response.ok) return databaseError(response, "The legal hold could not be created.");
    const rows = await response.json() as Array<{ id: string }>;
    await audit(context, "legal_hold_created", "legal_hold", rows[0]?.id || null, { participantScoped: Boolean(participantId), recordClass: recordClass || "all" });
    return NextResponse.json({ ok: true });
  }

  if (action === "release_hold") {
    const holdId = String(body.holdId || "");
    const reason = String(body.reason || "").trim();
    if (!holdId || reason.length < 10) return NextResponse.json({ error: "Add a release reason." }, { status: 400 });
    const response = await fetch(`${context.url}/rest/v1/legal_holds?id=eq.${encodeURIComponent(holdId)}&organisation_id=eq.${context.organisationId}&status=eq.active`, { method: "PATCH", headers: { ...context.headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "released", released_by: context.userId, released_at: new Date().toISOString(), release_reason: reason }) });
    if (!response.ok) return databaseError(response, "The legal hold could not be released.");
    const rows = await response.json() as Array<{ id: string }>;
    if (!rows.length) return NextResponse.json({ error: "The active legal hold was not found." }, { status: 404 });
    await audit(context, "legal_hold_released", "legal_hold", holdId, {});
    return NextResponse.json({ ok: true });
  }

  if (action === "review_candidate") {
    const candidateId = String(body.candidateId || "");
    const decision = String(body.decision || "");
    const reason = String(body.reason || "").trim();
    if (!candidateId || !["approve", "reviewed", "exempt"].includes(decision) || reason.length < 10) return NextResponse.json({ error: "Select a decision and record the reason." }, { status: 400 });
    const candidateResponse = await fetch(`${context.url}/rest/v1/retention_review_queue?select=*&id=eq.${encodeURIComponent(candidateId)}&organisation_id=eq.${context.organisationId}&limit=1`, { headers: context.headers, cache: "no-store" });
    const candidates = candidateResponse.ok ? await candidateResponse.json() as Array<{ id: string; participant_id: string | null; record_class: string; proposed_action: string }> : [];
    const candidate = candidates[0];
    if (!candidate) return NextResponse.json({ error: "The retention candidate was not found." }, { status: 404 });
    if (decision === "approve" && await hasActiveHold(context, candidate.participant_id, candidate.record_class)) return NextResponse.json({ error: "An active legal hold blocks this action." }, { status: 409 });
    const status = decision === "exempt" ? "exempted" : decision === "reviewed" || candidate.proposed_action === "review" ? "reviewed" : "approved";
    const update = await fetch(`${context.url}/rest/v1/retention_review_queue?id=eq.${candidate.id}&organisation_id=eq.${context.organisationId}`, { method: "PATCH", headers: context.headers, body: JSON.stringify({ status, review_reason: reason, reviewed_by: context.userId, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
    if (!update.ok) return databaseError(update, "The retention review could not be saved.");
    if (status === "approved" && ["deidentify", "delete"].includes(candidate.proposed_action)) {
      const job = await fetch(`${context.url}/rest/v1/retention_action_jobs?on_conflict=candidate_id`, { method: "POST", headers: { ...context.headers, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ organisation_id: context.organisationId, candidate_id: candidate.id, requested_action: candidate.proposed_action, status: "approved", requested_by: context.userId }) });
      if (!job.ok) return databaseError(job, "The controlled retention job could not be queued.");
    }
    await audit(context, "retention_candidate_reviewed", "retention_review", candidate.id, { decision, proposedAction: candidate.proposed_action });
    return NextResponse.json({ ok: true, executionEnabled: false });
  }

  return NextResponse.json({ error: "Unknown data lifecycle action." }, { status: 400 });
}

async function secureContext(request: Request): Promise<SecureContext> {
  const access = await verifyServerAccess(request, "admin", "settings", "organisation.settings.manage");
  if (!access.allowed) return { response: NextResponse.json({ error: access.reason }, { status: access.status }), url: "", organisationId: "", userId: "", headers: {} };
  if (!fullAdminRoles.has(access.role)) return { response: NextResponse.json({ error: "Only an owner or full administrator can manage retention." }, { status: 403 }), url: "", organisationId: "", userId: "", headers: {} };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return { response: NextResponse.json({ error: "Secure retention storage is not configured." }, { status: 503 }), url: "", organisationId: "", userId: "", headers: {} };
  return { response: null, url, organisationId: access.organisationId, userId: access.userId, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

async function participantBelongsToOrganisation(context: SecureContext, participantId: string) {
  const response = await fetch(`${context.url}/rest/v1/participants_or_clients?select=id&id=eq.${encodeURIComponent(participantId)}&organisation_id=eq.${context.organisationId}&limit=1`, { headers: context.headers, cache: "no-store" });
  return response.ok && (await response.json() as Array<{ id: string }>).length === 1;
}

async function hasActiveHold(context: SecureContext, participantId: string | null, recordClass: string) {
  const response = await fetch(`${context.url}/rest/v1/legal_holds?select=id,participant_id,record_class&organisation_id=eq.${context.organisationId}&status=eq.active`, { headers: context.headers, cache: "no-store" });
  const holds = response.ok ? await response.json() as Array<{ participant_id: string | null; record_class: string | null }> : [];
  return holds.some((hold) => (!hold.participant_id || hold.participant_id === participantId) && (!hold.record_class || hold.record_class === recordClass));
}

async function audit(context: SecureContext, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
  await fetch(`${context.url}/rest/v1/audit_logs`, { method: "POST", headers: { ...context.headers, Prefer: "return=minimal" }, body: JSON.stringify({ organisation_id: context.organisationId, actor_id: context.userId, action, entity_type: entityType, entity_id: entityId, metadata }) });
}

async function databaseError(response: Response, fallback: string) {
  console.error(fallback, response.status, await response.text());
  return NextResponse.json({ error: fallback }, { status: 502 });
}
