"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, ExternalLink, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

type Version = { id: string; version_name: string; effective_from: string; status: string };
type Diff = { draft_pricing_version_id: string; new_items_count: number; removed_items_count: number; changed_price_count: number };
type CommonServiceFee = {
  support_item_number: string;
  support_item_name: string;
  support_category: string | null;
  unit_type: string;
  time_band: string | null;
  state_or_region: string | null;
  remote_type: string | null;
  price_limit: number;
};
type State = { monitor: any; versions: Version[]; diffs: Diff[]; commonServiceFees: CommonServiceFee[] };

export function NdisPricingMonitorPanel() {
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [catalogueFile, setCatalogueFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-07-01`);

  const load = useCallback(async () => {
    const response = await fetch("/api/platform/ndis-pricing", { headers: getAuthenticatedApiHeaders(), cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Pricing status could not be loaded.");
    setData(body);
  }, []);

  useEffect(() => {
    void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Pricing status could not be loaded."));
  }, [load]);

  async function act(action: "check" | "publish", versionId?: string) {
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/platform/ndis-pricing", {
        method: "POST",
        headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, versionId })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Pricing action failed.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Pricing action failed.");
    } finally {
      setBusy("");
    }
  }

  async function uploadCatalogue() {
    if (!catalogueFile) return setError("Choose the official NDIS catalogue file first.");
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", catalogueFile);
      form.append("effectiveFrom", effectiveFrom);
      const response = await fetch("/api/platform/ndis-pricing", { method: "POST", headers: getAuthenticatedApiHeaders(), body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The catalogue could not be imported.");
      setCatalogueFile(null);
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The catalogue could not be imported.");
    } finally {
      setBusy("");
    }
  }

  const draft = data?.versions.find((version) => version.id === data.monitor?.draft_version_id && version.status === "draft");
  const active = data?.versions.find((version) => version.status === "active");
  const diff = data?.diffs.find((item) => item.draft_pricing_version_id === draft?.id);
  const fees = data?.commonServiceFees || [];

  return (
    <Card className="border-teal-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-teal-700">Controlled pricing source</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Official NDIS pricing</h2>
          <p className="mt-2 text-sm text-slate-600">Automatic checks create drafts. Only your approval can publish prices.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={data?.monitor?.status?.replaceAll("_", " ") || "Not checked"} tone={draft ? "amber" : active ? "green" : "blue"} />
          <button type="button" onClick={() => void act("check")} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-teal-400 disabled:opacity-50">
            <RefreshCw size={16} className={busy === "check" ? "animate-spin" : ""} />
            {busy === "check" ? "Checking..." : "Check now"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-700" /><h3 className="font-bold text-ink">Live version</h3></div>
          <p className="mt-3 font-semibold text-ink">{active?.version_name || "No platform version published"}</p>
          <p className="mt-1 text-sm text-slate-600">{active ? `Effective ${active.effective_from}` : "Provider catalogues remain unchanged."}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2"><UploadCloud size={18} className="text-teal-700" /><h3 className="font-bold text-ink">Review queue</h3></div>
          <p className="mt-3 font-semibold text-ink">{draft?.version_name || data?.monitor?.detected_filename || "No draft awaiting review"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{data?.monitor?.detail || "Run the first official source check."}</p>
          {diff ? <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-700"><span>{diff.changed_price_count} price changes</span><span>{diff.new_items_count} new</span><span>{diff.removed_items_count} removed</span></div> : null}
          {diff ? <div className="mt-4 space-y-2" aria-label="NDIS catalogue change chart">{[
            ["Price changes", diff.changed_price_count, "bg-teal-700"],
            ["New items", diff.new_items_count, "bg-sky-600"],
            ["Removed items", diff.removed_items_count, "bg-rose-600"]
          ].map(([label, value, colour]) => {
            const total = Math.max(1, diff.changed_price_count, diff.new_items_count, diff.removed_items_count);
            return <div key={String(label)} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-xs"><span className="font-semibold text-slate-600">{label}</span><span className="h-5 overflow-hidden rounded-md bg-slate-100"><span className={`block h-full rounded-md ${colour}`} style={{ width: `${Number(value) / total * 100}%` }} /></span><strong className="text-right text-ink">{value}</strong></div>;
          })}</div> : null}
          {data?.monitor?.detected_download_url ? <a href={data.monitor.detected_download_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">Open official file <ExternalLink size={14} /></a> : null}
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Official catalogue file<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(event) => setCatalogueFile(event.target.files?.[0] || null)} className="min-h-11 rounded-md border border-slate-300 bg-white p-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Effective from<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
            <button type="button" onClick={() => void uploadCatalogue()} disabled={Boolean(busy) || !catalogueFile} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-4 text-sm font-bold text-teal-900 hover:bg-teal-50 disabled:opacity-50"><UploadCloud size={16} />{busy === "upload" ? "Importing..." : "Import official catalogue"}</button>
          </div>
          {draft ? <button type="button" onClick={() => void act("publish", draft.id)} disabled={Boolean(busy)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50">{busy === "publish" ? "Publishing..." : "Publish reviewed version"}</button> : null}
        </div>
      </div>

      {active ? (
        <section className="mt-5 border-t border-slate-200 pt-5" aria-labelledby="common-service-fees-heading">
          <div className="flex items-center gap-2"><Banknote size={18} className="text-teal-700" /><h3 id="common-service-fees-heading" className="font-bold text-ink">Common service fees</h3></div>
          <p className="mt-1 text-sm text-slate-600">Representative maximum prices from the live catalogue.</p>
          {fees.length ? <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {fees.map((fee) => <div key={`${fee.support_item_number}-${fee.state_or_region || "national"}-${fee.remote_type || "standard"}`} className="min-w-0 rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-semibold text-ink">{fee.support_item_name}</p><p className="shrink-0 font-bold text-teal-800">{formatAud(fee.price_limit)}</p></div>
              <p className="mt-2 text-xs font-semibold text-slate-700">{fee.support_item_number} · per {fee.unit_type}</p>
              <p className="mt-1 text-xs text-slate-500">{formatFeeContext(fee)}</p>
            </div>)}
          </div> : <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">The live version has no positive service fees to display.</p>}
        </section>
      ) : null}

      {data?.monitor?.last_checked_at ? <p className="mt-4 text-xs text-slate-500">Last checked {new Date(data.monitor.last_checked_at).toLocaleString("en-AU")}</p> : null}
    </Card>
  );
}

function formatAud(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
}

function formatFeeContext(fee: CommonServiceFee) {
  return [fee.support_category, fee.time_band, fee.state_or_region, fee.remote_type?.replaceAll("_", " ")].filter(Boolean).join(" · ") || "Standard catalogue context";
}
