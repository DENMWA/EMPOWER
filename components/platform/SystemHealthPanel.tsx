"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

type HealthCheck = {
  id: string;
  name: string;
  status: "healthy" | "warning" | "critical";
  detail: string;
  checkedAt: string;
  responseMs: number;
};

type HealthSnapshot = {
  checkedAt: string;
  status: "healthy" | "degraded" | "critical";
  criticalCount: number;
  warningCount: number;
  checks: HealthCheck[];
};

type HealthIncident = {
  id: string;
  check_name: string;
  severity: "warning" | "critical";
  detail: string;
  first_detected_at: string;
  last_detected_at: string;
  resolved_at: string | null;
  occurrence_count: number;
};

export function SystemHealthPanel() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [historyMessage, setHistoryMessage] = useState("");

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform/health", { headers: getAuthenticatedApiHeaders(), cache: "no-store" });
      const result = await response.json() as HealthSnapshot & { error?: string };
      if (!response.ok) throw new Error(result.error || "System health scan could not be completed.");
      setSnapshot(result);
      const historyResponse = await fetch("/api/platform/health/incidents", { headers: getAuthenticatedApiHeaders(), cache: "no-store" });
      const history = await historyResponse.json() as { incidents?: HealthIncident[]; error?: string };
      if (historyResponse.ok) {
        setIncidents(history.incidents || []);
        setHistoryMessage("");
      } else {
        setHistoryMessage(history.error || "Monitoring history is not ready.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "System health scan could not be completed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void scan();
    const interval = window.setInterval(scan, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [scan]);

  const tone = snapshot?.status === "healthy" ? "green" : snapshot?.status === "critical" ? "red" : "amber";

  return (
    <Card className="border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Read-only monitoring</p>
          <h2 className="mt-2 text-xl font-bold text-ink">System health</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Issues are reported here for owner review. This monitor cannot repair, deploy, delete, charge, email, or change production settings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {snapshot ? <StatusBadge label={snapshot.status === "healthy" ? "All systems healthy" : snapshot.status === "critical" ? "Action required" : "Review warnings"} tone={tone} /> : null}
          <button type="button" onClick={() => void scan()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:text-slate-400">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            {loading ? "Scanning..." : "Run scan"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">Monitoring error: {error}</p> : null}
      {snapshot ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <HealthMetric label="Healthy" value={snapshot.checks.filter((check) => check.status === "healthy").length} icon={CheckCircle2} tone="green" />
            <HealthMetric label="Warnings" value={snapshot.warningCount} icon={AlertTriangle} tone="amber" />
            <HealthMetric label="Critical" value={snapshot.criticalCount} icon={XCircle} tone="red" />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {snapshot.checks.map((check) => (
              <div key={check.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity size={17} className={check.status === "healthy" ? "text-emerald-700" : check.status === "critical" ? "text-red-700" : "text-amber-700"} aria-hidden="true" />
                    <h3 className="font-semibold text-ink">{check.name}</h3>
                  </div>
                  <StatusBadge label={check.status} tone={check.status === "healthy" ? "green" : check.status === "critical" ? "red" : "amber"} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{check.detail}</p>
                <p className="mt-2 text-xs text-slate-500">Response {check.responseMs} ms</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">Last scan: {new Date(snapshot.checkedAt).toLocaleString("en-AU")} · Automatically rescans every five minutes while this console is open.</p>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">Background issue history</h3>
                <p className="mt-1 text-sm text-slate-600">Scheduled scans report failures and record when services recover. No automatic repairs are permitted.</p>
              </div>
              <StatusBadge label={`${incidents.filter((incident) => !incident.resolved_at).length} active`} tone={incidents.some((incident) => !incident.resolved_at) ? "amber" : "green"} />
            </div>
            {historyMessage ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{historyMessage}</p> : null}
            <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-ink">{incident.check_name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{incident.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">First detected {new Date(incident.first_detected_at).toLocaleString("en-AU")} · Last detected {new Date(incident.last_detected_at).toLocaleString("en-AU")} · {incident.occurrence_count} observation{incident.occurrence_count === 1 ? "" : "s"}</p>
                  </div>
                  <StatusBadge label={incident.resolved_at ? `Resolved ${new Date(incident.resolved_at).toLocaleDateString("en-AU")}` : incident.severity} tone={incident.resolved_at ? "green" : incident.severity === "critical" ? "red" : "amber"} />
                </div>
              ))}
              {!incidents.length && !historyMessage ? <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">No background incidents have been recorded.</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

function HealthMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof CheckCircle2; tone: "green" | "amber" | "red" }) {
  const styles = { green: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-800" };
  return <div className={`flex items-center gap-3 rounded-md px-4 py-3 ${styles[tone]}`}><Icon size={19} aria-hidden="true" /><div><p className="text-xs font-bold uppercase">{label}</p><p className="text-xl font-bold">{value}</p></div></div>;
}
