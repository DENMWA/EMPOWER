"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, CalendarRange, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, StatusBadge } from "@/components/ui";

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

const trendData: Record<ComparisonPeriod, TrendPoint[]> = {
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
  const points = trendData[period];
  const maxValue = Math.max(...points.flatMap((point) => metrics.map((metric) => point[metric.key])));
  const insights = useMemo(() => buildInsights(points), [points]);

  return (
    <Card className="overflow-hidden border-slate-200 p-0">
      <div className="grid gap-6 border-b border-slate-200 bg-slate-950 p-5 text-white lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="inline-flex rounded-md bg-white/10 px-3 py-1 text-sm font-semibold text-teal-100">Live reporting intelligence</p>
          <h2 className="mt-4 text-2xl font-bold">Comparative support trends</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Track incident reports, community access, and irregular support patterns over time so admin can see progress, risk movement, and where follow-up is needed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
              <p className="mt-1 text-sm text-slate-600">Grouped bars compare service activity and risk signals across the selected period.</p>
            </div>
            <StatusBadge label="Admin-only analysis" tone="blue" />
          </div>

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
