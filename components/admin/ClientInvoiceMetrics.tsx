"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import type { ClientRecord } from "@/lib/client-records";
import type { NativeInvoice } from "@/lib/native-billing";
import { cn } from "@/lib/utils";

const completedStatuses = new Set(["sent", "paid"]);
const pendingStatuses = new Set(["draft", "review_required", "approved"]);

export function ClientInvoiceMetrics({ clients, invoices }: { clients: ClientRecord[]; invoices: NativeInvoice[] }) {
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    if (!clients.some((client) => client.id === selectedClientId)) setSelectedClientId(clients[0]?.id || "");
  }, [clients, selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0];
  const selectedInvoices = useMemo(() => invoices.filter((invoice) => invoice.participantId === selectedClient?.id && invoice.status !== "void"), [invoices, selectedClient?.id]);
  const colour = getClientColourScheme(selectedClient?.id || "client", selectedClient?.colourSchemeId);
  const completed = selectedInvoices.filter((invoice) => completedStatuses.has(invoice.status)).length;
  const pending = selectedInvoices.filter((invoice) => pendingStatuses.has(invoice.status)).length;
  const paid = selectedInvoices.filter((invoice) => invoice.paymentStatus === "paid");
  const paymentPending = selectedInvoices.filter((invoice) => invoice.paymentStatus !== "paid" && completedStatuses.has(invoice.status)).length;
  const billedAmount = selectedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const paidAmount = paid.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const completionRate = selectedInvoices.length ? Math.round((completed / selectedInvoices.length) * 100) : 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-teal-200">Client invoice intelligence</p><h2 className="mt-2 text-2xl font-bold">Completed and pending invoices</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">Track invoice completion, outstanding payment, and value for each client without combining financial records.</p></div>
        <StatusBadge label={`${invoices.filter((invoice) => invoice.status !== "void").length} active invoices`} tone="blue" />
      </div>

      {!clients.length ? <div className="p-5"><p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Add clients to create their invoice reporting stream.</p></div> : (
        <div className="grid xl:grid-cols-[320px_1fr]">
          <div className="border-b border-slate-200 bg-slate-50 p-4 xl:border-b-0 xl:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice status by client</p>
            <div className="grid max-h-[540px] gap-2 overflow-y-auto">
              {clients.map((client) => {
                const clientInvoices = invoices.filter((invoice) => invoice.participantId === client.id && invoice.status !== "void");
                const clientCompleted = clientInvoices.filter((invoice) => completedStatuses.has(invoice.status)).length;
                const clientPending = clientInvoices.filter((invoice) => pendingStatuses.has(invoice.status)).length;
                const clientColour = getClientColourScheme(client.id, client.colourSchemeId);
                const active = client.id === selectedClient?.id;
                const rate = clientInvoices.length ? Math.round((clientCompleted / clientInvoices.length) * 100) : 0;
                return (
                  <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} aria-pressed={active} className={cn("rounded-md border border-l-4 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline focus:outline-2 focus:outline-teal-700", clientColour.border, active && "ring-2 ring-teal-200")}>
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-ink">{client.name}</span><span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", clientColour.badge)}>{rate}%</span></div>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100"><span className={cn("h-full", clientColour.bar)} style={{ width: `${rate}%` }} /><span className="h-full bg-amber-400" style={{ width: `${clientInvoices.length ? (clientPending / clientInvoices.length) * 100 : 0}%` }} /></div>
                    <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500"><span>{clientCompleted} completed</span><span>{clientPending} pending</span></div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border border-l-4 p-4", colour.border, colour.panel)}><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected client</p><h3 className={cn("mt-1 text-2xl font-bold", colour.text)}>{selectedClient?.name}</h3></div><StatusBadge label={`${completionRate}% invoice completion`} tone={completionRate >= 90 ? "green" : selectedInvoices.length ? "amber" : "blue"} /></div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <InvoiceMetric icon={CheckCircle2} label="Completed" value={completed} tone="green" />
              <InvoiceMetric icon={Clock3} label="Pending" value={pending} tone="amber" />
              <InvoiceMetric icon={ReceiptText} label="Payment pending" value={paymentPending} tone="red" />
              <InvoiceMetric icon={Banknote} label="Paid" value={paid.length} tone="blue" />
              <InvoiceMetric icon={ReceiptText} label="Billed" value={formatCurrency(billedAmount)} tone="slate" compact />
              <InvoiceMetric icon={Banknote} label="Paid value" value={formatCurrency(paidAmount)} tone="green" compact />
            </div>

            <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><h4 className="font-semibold text-ink">Recent invoices</h4><span className="text-sm font-semibold text-slate-500">{selectedInvoices.length} records</span></div>
              {!selectedInvoices.length ? <p className="p-4 text-sm text-slate-600">No invoices have been created for this client.</p> : (
                <div className="divide-y divide-slate-100">
                  {selectedInvoices.slice(0, 6).map((invoice) => <div key={invoice.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold text-ink">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-slate-500">Due {formatDate(invoice.dueDate)}</p></div><span className="font-bold text-ink">{formatCurrency(invoice.totalAmount)}</span><span className={cn("rounded-md px-2.5 py-1 text-xs font-bold", invoiceTone(invoice))}>{invoice.status.replaceAll("_", " ")} - {invoice.paymentStatus.replaceAll("_", " ")}</span></div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function InvoiceMetric({ icon: Icon, label, value, tone, compact = false }: { icon: typeof ReceiptText; label: string; value: string | number; tone: "green" | "amber" | "red" | "blue" | "slate"; compact?: boolean }) {
  const tones = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-700", blue: "bg-sky-50 text-sky-700", slate: "bg-slate-100 text-slate-700" };
  return <div className={cn("rounded-md p-3", tones[tone])}><Icon size={17} aria-hidden="true" /><p className="mt-2 text-xs font-semibold">{label}</p><p className={cn("mt-1 font-bold", compact ? "text-lg" : "text-2xl")}>{value}</p></div>;
}

function invoiceTone(invoice: NativeInvoice) {
  if (invoice.paymentStatus === "paid") return "bg-emerald-50 text-emerald-700";
  if (invoice.paymentStatus === "overdue" || invoice.status === "review_required") return "bg-red-50 text-red-700";
  if (pendingStatuses.has(invoice.status)) return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-700";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
