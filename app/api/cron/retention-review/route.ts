import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Schedule = { organisation_id: string; record_class: string; retention_years: number; proposed_action: "review" | "deidentify" | "delete" };
type Hold = { id: string; organisation_id: string; participant_id: string | null; record_class: string | null };
type SourceRow = { id: string; organisation_id: string; participant_id: string | null; [key: string]: string | null };

const sources: Record<string, { table: string; dateColumn: string; participantColumn: string | null }> = {
  care_records: { table: "progress_notes", dateColumn: "created_at", participantColumn: "participant_id" },
  incident_records: { table: "incident_reports", dateColumn: "created_at", participantColumn: "participant_id" },
  restrictive_practice_records: { table: "restrictive_practice_uses", dateColumn: "used_at", participantColumn: "participant_id" },
  billing_records: { table: "native_invoices", dateColumn: "invoice_date", participantColumn: "participant_id" },
  document_records: { table: "documents", dateColumn: "created_at", participantColumn: "participant_id" },
  workforce_records: { table: "staff_invites", dateColumn: "assignment_end_date", participantColumn: null }
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorised retention scan." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Retention storage is not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  const [scheduleResponse, holdResponse] = await Promise.all([
    fetch(`${url}/rest/v1/retention_schedules?select=organisation_id,record_class,retention_years,proposed_action&status=eq.approved`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/legal_holds?select=id,organisation_id,participant_id,record_class&status=eq.active`, { headers, cache: "no-store" })
  ]);
  if (!scheduleResponse.ok || !holdResponse.ok) return NextResponse.json({ error: "Retention schedules or legal holds could not be loaded." }, { status: 503 });

  const schedules = await scheduleResponse.json() as Schedule[];
  const holds = await holdResponse.json() as Hold[];
  let recordsChecked = 0;
  let candidatesCreated = 0;
  let heldCandidates = 0;

  for (const schedule of schedules) {
    const source = sources[schedule.record_class];
    if (!source) continue;
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - schedule.retention_years);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const selectedColumns = ["id", "organisation_id", source.participantColumn, source.dateColumn].filter(Boolean).join(",");
    const recordsResponse = await fetch(`${url}/rest/v1/${source.table}?select=${selectedColumns}&organisation_id=eq.${encodeURIComponent(schedule.organisation_id)}&${source.dateColumn}=not.is.null&${source.dateColumn}=lte.${cutoffDate}&limit=1000`, { headers, cache: "no-store" });
    if (!recordsResponse.ok) continue;
    const records = await recordsResponse.json() as SourceRow[];
    recordsChecked += records.length;
    const candidates = records.map((record) => {
      const recordedAt = String(record[source.dateColumn] || cutoffDate);
      const eligibleAt = addYears(recordedAt, schedule.retention_years);
      const participantId = source.participantColumn ? record[source.participantColumn] : null;
      const legalHold = holds.find((hold) => hold.organisation_id === schedule.organisation_id
        && (!hold.participant_id || hold.participant_id === participantId)
        && (!hold.record_class || hold.record_class === schedule.record_class));
      if (legalHold) heldCandidates += 1;
      return {
        organisation_id: schedule.organisation_id,
        participant_id: participantId,
        record_class: schedule.record_class,
        source_table: source.table,
        source_record_id: record.id,
        recorded_at: recordedAt,
        eligible_at: eligibleAt,
        proposed_action: schedule.proposed_action,
        status: legalHold ? "held" : "pending",
        legal_hold_id: legalHold?.id || null
      };
    });
    if (!candidates.length) continue;
    const insertResponse = await fetch(`${url}/rest/v1/retention_review_queue?on_conflict=organisation_id,source_table,source_record_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(candidates)
    });
    if (insertResponse.ok) candidatesCreated += (await insertResponse.json() as Array<{ id: string }>).length;
  }

  return NextResponse.json({ ok: true, schedulesChecked: schedules.length, recordsChecked, candidatesCreated, heldCandidates, destructiveActionsExecuted: 0, checkedAt: new Date().toISOString() });
}

function addYears(value: string, years: number) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}
