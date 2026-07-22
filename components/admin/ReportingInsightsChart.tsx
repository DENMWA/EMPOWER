"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, CalendarRange, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, StatusBadge } from "@/components/ui";
import { isDemoModeEnabled } from "@/lib/presentation-mode";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

type ComparisonPeriod = "weekly" | "monthly" | "halfYearly" | "yearly";

type TrendPoint = {
  label: string;
  incidentReports: number;
  communityAccess: number;
  irregularSupport: number;
};

const periodLabels: Record<ComparisonPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  halfYearly: "Half yearly",
  yearly: "Yearly"
};

const demoTrendData: Record<ComparisonPeriod, TrendPoint[]> = {
  weekly: [
    { label: "W1", incidentReports: 7, communityAccess: 18, irregularSupport: 9 },
    { label: "W2", incidentReports: 5, communityAccess: 21, irregularSupport: 7 },
    { label: "W3", incidentReports: 6, communityAccess: 24, irregularSupport: 5 },
    { label: "W4", incidentReports: 3, communityAccess: 28, irregularSupport: 4 }
  ],
  monthly: [
    { label: "Mar", incidentReports: 19, communityAccess: 74, irregularSupport: 22 },
    { label: "Apr", incidentReports: 15, communityAccess: 82, irregularSupport: 19 },
    { label: "May", incidentReports: 12, communityAccess: 89, irregularSupport: 14 },
    { label: "Jun", incidentReports: 9, communityAccess: 96, irregularSupport: 11 }
  ],
  halfYearly: [
    { label: "H2 2025", incidentReports: 88, communityAccess: 392, irregularSupport: 104 },
    { label: "H1 2026", incidentReports: 64, communityAccess: 511, irregularSupport: 71 }
  ],
  yearly: [
    { label: "2024", incidentReports: 182, communityAccess: 774, irregularSupport: 231 },
    { label: "2025", incidentReports: 146, communityAccess: 891, irregularSupport: 184 },
    { label: "2026 YTD", incidentReports: 64, communityAccess: 511, irregularSupport: 71 }
  ]
};

const metrics = [
  {
    key: "incidentReports",
    label: "Incident reports",
    detail: "Lower is better when support quality and early intervention improve.",
    color: "bg-red-500",
    soft: "bg-red-50 text-red-700",
    icon: AlertTriangle
  },
  {
    key: "communityAccess",
    label: "Community access",
    detail: "Higher can show stronger participation and service delivery.",
    color: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
    icon: Activity
  },
  {
    key: "irregularSupport",
    label: "Irregular support",
    detail: "Lower suggests fewer cancelled, disrupted, or unplanned supports.",
    color: "bg-amber-500",
    soft: "bg-amber-50 text-amber-800",
    icon: CalendarRange
  }
] as const;

type MetricKey = (typeof metrics)[number]["key"];

export function ReportingInsightsChart() {
  const [period, setPeriod] = useState<ComparisonPeriod>("monthly");
  const [records, setRecords] = useState<RetainedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const clientNames = useMemo(() => getClientNames(records), [records]);
  const filteredRecords = useMemo(() => clientFilter === "all" ? records : records.filter((record) => recordToEvents(record).some((event) => event.clientName === clientFilter)), [clientFilter, records]);
  const liveTrendData = useMemo(() => buildTrendData(filteredRecords), [filteredRecords]);
  const livePointCount = useMemo(() => countTrendActivity(liveTrendData), [liveTrendData]);
  const trendData = livePointCount > 0 || !demoMode ? liveTrendData : demoTrendData;
  const points = trendData[period];
  const maxValue = Math.max(1, ...points.flatMap((point) => metrics.map((metric) => point[metric.key])));
  const insights = useMemo(() => buildInsights(points), [points]);

  useEffect(() => {
    function syncDataMode() {
      setDemoMode(isDemoModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  useEffect(() => {
    if (clientFilter !== "all" && !clientNames.includes(clientFilter)) {
      setClientFilter("all");
    }
  }, [clientFilter, clientNames]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      const [notes, incidents] = await Promise.all([
        getTenantRetainedRecords("progress-note").catch(() => []),
        getTenantRetainedRecords("incident-report").catch(() => [])
      ]);

      if (!cancelled) {
        setRecords(dedupeRecords([...notes, ...incidents]));
        setLoading(false);
      }
    }

    loadRecords();
    const interval = window.setInterval(loadRecords, 60000);
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    window.addEventListener("focus", loadRecords);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
      window.removeEventListener("focus", loadRecords);
    };
  }, []);

  return (
    <Card className="overflow-hidden border-slate-200 p-0">
      <div className="grid gap-6 border-b border-slate-200 bg-slate-950 p-5 text-white lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="inline-flex rounded-md bg-white/10 px-3 py-1 text-sm font-semibold text-teal-100">Live reporting intelligence</p>
          <h2 className="mt-4 text-2xl font-bold">Comparative support trends</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Track incident reports, community access, and irregular support patterns over time so admin can see progress, risk movement, and where follow-up is needed.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label={livePointCount > 0 ? "Using saved organisation records" : demoMode ? "Demo trend shown" : "Waiting for saved records"} tone={livePointCount > 0 ? "green" : "blue"} />
            <StatusBadge label={loading ? "Refreshing..." : `${records.length} saved records checked`} tone="slate" />
            {clientNames.slice(0, 3).map((client) => <StatusBadge key={client} label={client} tone="blue" />)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="min-h-10 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-teal-300"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            aria-label="Filter chart by client"
          >
            <option className="text-ink" value="all">All clients</option>
            {clientNames.map((client) => <option className="text-ink" key={client} value={client}>{client}</option>)}
          </select>
          {(Object.keys(periodLabels) as ComparisonPeriod[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={cn(
                "min-h-10 rounded-md border px-3 text-sm font-semibold transition focus:outline focus:outline-2 focus:outline-teal-300",
                period === item ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/15 bg-white/5 text-white hover:bg-white/10"
              )}
            >
              {periodLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
        <div className="p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-ink">{periodLabels[period]} comparison</h3>
              <p className="mt-1 text-sm text-slate-600">Grouped bars compare saved service activity and risk signals across the selected period.</p>
            </div>
            <StatusBadge label="Admin-only analysis" tone="blue" />
          </div>

          {livePointCount === 0 && !demoMode ? (
            <div className="mb-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="font-semibold text-ink">No live chart data yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Save progress notes and incident reports to Supabase, then this chart will update for weekly, monthly, half-yearly, and yearly reporting.</p>
            </div>
          ) : null}

          <div className="grid min-h-[280px] grid-cols-[auto_1fr] gap-3">
            <div className="flex flex-col justify-between pb-9 pt-2 text-right text-xs font-medium text-slate-500">
              <span>{maxValue}</span>
              <span>{Math.round(maxValue * 0.66)}</span>
              <span>{Math.round(maxValue * 0.33)}</span>
              <span>0</span>
            </div>
            <div className="relative flex items-end gap-4 overflow-x-auto rounded-md border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 pb-8 pt-4">
              <div className="pointer-events-none absolute inset-x-4 top-4 h-px bg-slate-200" />
              <div className="pointer-events-none absolute inset-x-4 top-1/3 h-px bg-slate-200" />
              <div className="pointer-events-none absolute inset-x-4 top-2/3 h-px bg-slate-200" />
              {points.map((point) => (
                <div key={point.label} className="relative z-10 grid min-w-24 flex-1 gap-3">
                  <div className="flex h-56 items-end justify-center gap-2">
                    {metrics.map((metric) => (
                      <Bar key={metric.key} label={metric.label} value={point[metric.key]} maxValue={maxValue} color={metric.color} />
                    ))}
                  </div>
                  <p className="text-center text-xs font-semibold text-slate-600">{point.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {metrics.map((metric) => (
              <span key={metric.key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className={cn("h-3 w-3 rounded-sm", metric.color)} />
                {metric.label}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-teal-700" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-ink">Progress signals</h3>
          </div>
          <div className="mt-4 grid gap-3">
            {metrics.map((metric) => {
              const insight = insights[metric.key];
              const Icon = metric.icon;
              const TrendIcon = insight.direction === "up" ? TrendingUp : TrendingDown;
              return (
                <div key={metric.key} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("grid h-10 w-10 place-items-center rounded-md", metric.soft)}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold", insight.good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
                      <TrendIcon size={14} aria-hidden="true" />
                      {insight.changeLabel}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-ink">{metric.label}</h4>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.detail}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Bar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const height = maxValue === 0 ? 0 : Math.max(8, Math.round((value / maxValue) * 210));

  return (
    <div className="flex w-6 flex-col items-center gap-2">
      <span className="text-[11px] font-semibold text-slate-600">{value}</span>
      <div className={cn("w-full rounded-t-md shadow-sm transition-all", color)} style={{ height }} title={`${label}: ${value}`} />
    </div>
  );
}

function dedupeRecords(records: RetainedRecord[]) {
  return records.filter((record, index, allRecords) => allRecords.findIndex((item) => item.id === record.id) === index);
}

function countTrendActivity(data: Record<ComparisonPeriod, TrendPoint[]>) {
  return Object.values(data).flat().reduce((total, point) => total + point.incidentReports + point.communityAccess + point.irregularSupport, 0);
}

function buildTrendData(records: RetainedRecord[]): Record<ComparisonPeriod, TrendPoint[]> {
  const events = records.flatMap(recordToEvents);
  return {
    weekly: buildRecentWeeklyPoints(events),
    monthly: buildRecentMonthlyPoints(events),
    halfYearly: buildRecentHalfYearlyPoints(events),
    yearly: buildRecentYearlyPoints(events)
  };
}

type ChartEvent = {
  date: Date;
  clientName: string;
  metric: MetricKey;
};

function recordToEvents(record: RetainedRecord): ChartEvent[] {
  const fallbackDate = parseDate(record.savedAt) ?? new Date();

  if (record.type === "incident-report") {
    const incident = parseIncidentBody(record.body);
    return [{
      date: parseDate(incident?.date) ?? fallbackDate,
      clientName: incident?.participant || extractField(record.body, "Client") || "Unassigned client",
      metric: "incidentReports"
    }];
  }

  if (record.type !== "progress-note") return [];

  const supportType = extractField(record.body, "Support type") || record.title;
  const text = `${record.title} ${record.body}`.toLowerCase();
  const metric = classifyProgressMetric(supportType, text);
  if (!metric) return [];

  return [{
    date: parseDate(extractField(record.body, "Date")) ?? fallbackDate,
    clientName: extractField(record.body, "Client") || "Unassigned client",
    metric
  }];
}

function parseIncidentBody(body: string) {
  try {
    return JSON.parse(body) as { date?: string; participant?: string };
  } catch {
    return null;
  }
}

function classifyProgressMetric(supportType: string, text: string): MetricKey | null {
  const support = supportType.toLowerCase();
  if (support.includes("community access") || text.includes("community access")) return "communityAccess";

  const irregularTerms = ["irregular", "cancelled", "canceled", "no show", "unplanned", "missed support", "refused support", "shift changed", "late attendance"];
  if (irregularTerms.some((term) => text.includes(term))) return "irregularSupport";

  return null;
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildRecentWeeklyPoints(events: ChartEvent[]) {
  const starts = Array.from({ length: 4 }, (_, index) => startOfWeek(addDays(new Date(), -7 * (3 - index))));
  return starts.map((start, index) => buildPoint(`W${index + 1}`, events, start, addDays(start, 7)));
}

function buildRecentMonthlyPoints(events: ChartEvent[]) {
  const now = new Date();
  const starts = Array.from({ length: 4 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (3 - index), 1));
  return starts.map((start) => buildPoint(start.toLocaleDateString("en-AU", { month: "short" }), events, start, new Date(start.getFullYear(), start.getMonth() + 1, 1)));
}

function buildRecentHalfYearlyPoints(events: ChartEvent[]) {
  const now = new Date();
  const currentHalfStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  const previousHalfStart = new Date(currentHalfStart.getMonth() === 0 ? currentHalfStart.getFullYear() - 1 : currentHalfStart.getFullYear(), currentHalfStart.getMonth() === 0 ? 6 : 0, 1);
  return [previousHalfStart, currentHalfStart].map((start) => {
    const half = start.getMonth() === 0 ? "H1" : "H2";
    return buildPoint(`${half} ${start.getFullYear()}`, events, start, new Date(start.getFullYear(), start.getMonth() + 6, 1));
  });
}

function buildRecentYearlyPoints(events: ChartEvent[]) {
  const year = new Date().getFullYear();
  return [year - 2, year - 1, year].map((item) => buildPoint(item === year ? `${item} YTD` : String(item), events, new Date(item, 0, 1), new Date(item + 1, 0, 1)));
}

function buildPoint(label: string, events: ChartEvent[], start: Date, end: Date): TrendPoint {
  const point: TrendPoint = { label, incidentReports: 0, communityAccess: 0, irregularSupport: 0 };
  events.forEach((event) => {
    if (event.date >= start && event.date < end) {
      point[event.metric] += 1;
    }
  });
  return point;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getClientNames(records: RetainedRecord[]) {
  return Array.from(new Set(records.flatMap(recordToEvents).map((event) => event.clientName).filter(Boolean))).sort();
}

function buildInsights(points: TrendPoint[]) {
  return metrics.reduce<Record<MetricKey, { changeLabel: string; direction: "up" | "down"; good: boolean; summary: string }>>((result, metric) => {
    const first = points[0][metric.key];
    const last = points[points.length - 1][metric.key];
    const change = last - first;
    const direction = change >= 0 ? "up" : "down";
    const absolute = Math.abs(change);
    const good = metric.key === "communityAccess" ? change >= 0 : change <= 0;
    const movement = change === 0 ? "remained stable" : `${direction === "up" ? "increased" : "reduced"} by ${absolute}`;

    const summaries: Record<MetricKey, string> = {
      incidentReports: `Incident reporting ${movement}. Use this to check whether behaviour support, environment planning, and escalation follow-up are reducing risk.`,
      communityAccess: `Community access ${movement}. This helps show participation progress and whether support delivery is increasing safely.`,
      irregularSupport: `Irregular support ${movement}. Review cancellations, no-shows, and unplanned changes when this number rises.`
    };

    result[metric.key] = {
      changeLabel: change === 0 ? "Stable" : `${change > 0 ? "+" : "-"}${absolute}`,
      direction,
      good,
      summary: summaries[metric.key]
    };
    return result;
  }, {} as Record<MetricKey, { changeLabel: string; direction: "up" | "down"; good: boolean; summary: string }>);
}
