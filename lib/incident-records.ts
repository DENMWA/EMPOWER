import { getTenantRetainedRecords, saveTenantRetainedRecord, type RetainedRecord } from "@/lib/retained-records";

export type IncidentStatus = "Draft" | "Submitted" | "Needs Review" | "Locked";

export type StoredIncidentReport = {
  incidentId: string;
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
};

export function parseIncidentRecord(record: RetainedRecord) {
  try {
    const report = JSON.parse(record.body) as StoredIncidentReport;
    return report?.incidentId ? report : null;
  } catch {
    return null;
  }
}

export async function getSavedIncidentReports() {
  const records = await getTenantRetainedRecords("incident-report");
  return records
    .map((record) => {
      const report = parseIncidentRecord(record);
      return report ? { record, report } : null;
    })
    .filter((item): item is { record: RetainedRecord; report: StoredIncidentReport } => Boolean(item));
}

export async function saveIncidentReport(report: StoredIncidentReport) {
  const savedIso = new Date().toISOString();
  const record = {
    id: `incident-${report.incidentId}`,
    type: "incident-report",
    title: `Incident Report - ${report.incidentId}`,
    body: JSON.stringify(report, null, 2),
    savedAt: savedIso
  };

  const result = await saveTenantRetainedRecord(record);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`empowernotes-incident:${report.incidentId}`, record.body);
    window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
  }

  return { ...result, savedAt: savedIso };
}
