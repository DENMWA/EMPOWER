import { getTenantRetainedRecords, saveTenantRetainedRecord, type RetainedRecord } from "@/lib/retained-records";
import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

export type IncidentStatus = "Draft" | "Submitted" | "Needs Review" | "Locked";

export type StoredIncidentReport = {
  incidentId: string;
  participantId: string;
  houseId: string;
  houseName: string;
  date: string;
  time: string;
  location: string;
  participant: string;
  reporter: string;
  status: IncidentStatus;
  incidentTypes: string[];
  whatHappened: string;
  injurySummary: string;
  immediateAction: string;
  notifications: string;
  followUp: string;
  managerReview: string;
  propertyDamage?: {
    involved: boolean;
    items: string[];
    otherItem: string;
    description: string;
    estimatedCost: string;
    immediateAction: string;
    bodilyInjury: boolean;
    bodilyInjuryDescription: string;
  };
  markers?: Array<{
    id: string;
    view: string;
    x: number;
    y: number;
    area: string;
    injury: string;
    severity: string;
    notes: string;
  }>;
  attachments?: Array<{
    id?: string;
    name: string;
    type: string;
    notes: string;
  }>;
};

type SupabaseIncidentReportRow = {
  id: string;
  app_incident_id: string | null;
  app_participant_id: string | null;
  house_id: string | null;
  house_name: string | null;
  participant_name: string | null;
  reporter_name: string | null;
  incident_date: string;
  incident_time: string;
  location: string | null;
  status: IncidentStatus;
  incident_types: string[] | null;
  what_happened: string | null;
  injury_harm_summary: string | null;
  immediate_action_taken: string | null;
  notification_notes: string | null;
  follow_up_notes: string | null;
  manager_comments: string | null;
  property_damage: StoredIncidentReport["propertyDamage"] | null;
  body_markers: StoredIncidentReport["markers"] | null;
  attachments: StoredIncidentReport["attachments"] | null;
  incident_payload: StoredIncidentReport | null;
  created_at: string | null;
  updated_at: string | null;
};

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseIncidentRecord(record: RetainedRecord) {
  try {
    const report = JSON.parse(record.body) as StoredIncidentReport;
    if (!report?.incidentId) return null;
    return {
      ...report,
      participantId: report.participantId || "unassigned-client",
      houseId: report.houseId || "unassigned-house",
      houseName: report.houseName || "Unassigned house/service",
      participant: report.participant || "Unassigned client"
    };
  } catch {
    return null;
  }
}

export async function getSavedIncidentReports() {
  const records = await getTenantRetainedRecords("incident-report");
  const retainedReports = records
    .map((record) => {
      const report = parseIncidentRecord(record);
      return report ? { record, report } : null;
    })
    .filter((item): item is { record: RetainedRecord; report: StoredIncidentReport } => Boolean(item));

  const structuredReports = await getStructuredIncidentReports();
  const retainedKeys = new Set(retainedReports.map((item) => getIncidentReportKey(item.report)));
  const structuredOnlyReports = structuredReports
    .filter((item) => !retainedKeys.has(getIncidentReportKey(item.report)));

  return [...retainedReports, ...structuredOnlyReports];
}

export async function saveIncidentReport(report: StoredIncidentReport) {
  const savedIso = new Date().toISOString();
  const record = {
    id: `incident-${report.participantId || "unassigned-client"}-${report.houseId || "unassigned-house"}-${report.incidentId}`,
    type: "incident-report",
    title: `Incident Report - ${report.participant} - ${report.houseName || "Unassigned house/service"} - ${report.incidentId}`,
    body: JSON.stringify(report, null, 2),
    savedAt: savedIso
  };

  const result = await saveTenantRetainedRecord(record);
  const structuredResult = await saveStructuredIncidentReport(report);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`empowernotes-incident:${report.participantId || "unassigned-client"}:${report.houseId || "unassigned-house"}:${report.incidentId}`, record.body);
    window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
  }

  return {
    ...result,
    savedToStructuredCloud: structuredResult.savedToCloud,
    structuredError: structuredResult.error,
    savedAt: savedIso
  };
}

function getIncidentReportKey(report: StoredIncidentReport) {
  return `${report.participantId || "unassigned-client"}:${report.houseId || "unassigned-house"}:${report.incidentId}`;
}

function toStructuredIncidentReport(row: SupabaseIncidentReportRow): StoredIncidentReport {
  if (row.incident_payload?.incidentId) {
    return {
      ...row.incident_payload,
      status: row.status || row.incident_payload.status || "Draft",
      managerReview: row.manager_comments || row.incident_payload.managerReview || ""
    };
  }

  return {
    incidentId: row.app_incident_id || row.id,
    participantId: row.app_participant_id || "unassigned-client",
    houseId: row.house_id || "unassigned-house",
    houseName: row.house_name || "Unassigned house/service",
    date: row.incident_date,
    time: row.incident_time,
    location: row.location || "",
    participant: row.participant_name || "Unassigned client",
    reporter: row.reporter_name || "",
    status: row.status || "Draft",
    incidentTypes: row.incident_types || [],
    whatHappened: row.what_happened || "",
    injurySummary: row.injury_harm_summary || "",
    immediateAction: row.immediate_action_taken || "",
    notifications: row.notification_notes || "",
    followUp: row.follow_up_notes || "",
    managerReview: row.manager_comments || "",
    propertyDamage: row.property_damage || undefined,
    markers: row.body_markers || undefined,
    attachments: row.attachments || undefined
  };
}

async function getStructuredIncidentReports() {
  const result = await supabaseRequest<SupabaseIncidentReportRow[]>("incident_reports", {
    query: "select=id,app_incident_id,app_participant_id,house_id,house_name,participant_name,reporter_name,incident_date,incident_time,location,status,incident_types,what_happened,injury_harm_summary,immediate_action_taken,notification_notes,follow_up_notes,manager_comments,property_damage,body_markers,attachments,incident_payload,created_at,updated_at&order=updated_at.desc"
  });

  if (!result.data || result.error) return [];

  return result.data.map((row) => ({
    record: {
      id: `structured-incident-${row.app_incident_id || row.id}`,
      type: "incident-report",
      title: `Incident Report - ${row.participant_name || "Unassigned client"} - ${row.house_name || "Unassigned house/service"} - ${row.app_incident_id || row.id}`,
      body: JSON.stringify(toStructuredIncidentReport(row), null, 2),
      savedAt: row.updated_at || row.created_at || new Date().toISOString()
    },
    report: toStructuredIncidentReport(row)
  }));
}

async function saveStructuredIncidentReport(report: StoredIncidentReport) {
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving incident data to your workspace." };

  const userId = getCurrentUserId();
  const result = await supabaseRequest<Array<{ id: string }>>("incident_reports", {
    method: "POST",
    query: "on_conflict=organisation_id,app_incident_id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organisation_id: organisationId,
      app_incident_id: report.incidentId,
      app_participant_id: report.participantId,
      participant_id: looksLikeUuid(report.participantId) ? report.participantId : null,
      house_id: report.houseId || null,
      house_name: report.houseName || null,
      participant_name: report.participant || null,
      reporter_name: report.reporter || null,
      reported_by: userId || null,
      incident_date: report.date,
      incident_time: report.time,
      location: report.location || null,
      status: report.status,
      incident_types: report.incidentTypes || [],
      what_happened: report.whatHappened || null,
      injury_harm_summary: report.injurySummary || null,
      anyone_injured: Boolean(report.injurySummary?.trim() || report.markers?.length || report.propertyDamage?.bodilyInjury),
      immediate_action_taken: report.immediateAction || null,
      notification_notes: report.notifications || null,
      follow_up_required: Boolean(report.followUp?.trim()),
      follow_up_notes: report.followUp || null,
      manager_comments: report.managerReview || null,
      manager_review_status: report.status === "Locked" ? "Closed" : report.status === "Draft" ? "Draft" : "Pending Review",
      property_damage: report.propertyDamage || null,
      property_damage_involved: Boolean(report.propertyDamage?.involved),
      property_damage_items: report.propertyDamage?.items || [],
      property_damage_description: report.propertyDamage?.description || null,
      property_damage_estimated_cost: report.propertyDamage?.estimatedCost || null,
      body_markers: report.markers || [],
      attachments: report.attachments || [],
      incident_payload: report,
      updated_at: new Date().toISOString()
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}
