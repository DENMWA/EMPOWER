"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

export function SupportIssueForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [severity, setSeverity] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/support/issues", {
      method: "POST",
      headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, severity, pagePath: window.location.pathname, browser: navigator.userAgent, deploymentId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "" })
    });
    const body = await response.json() as { error?: string; caseId?: string };
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "The issue could not be submitted.");
    setTitle("");
    setDescription("");
    setMessage(`Issue submitted. Reference ${body.caseId?.slice(0, 8) || "received"}.`);
  }

  return <Card className="max-w-3xl"><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-slate-700">Area<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal text-ink"><option value="general">General</option><option value="access">Access</option><option value="billing">Billing</option><option value="documents">Documents</option><option value="incidents">Incidents</option><option value="notes">Progress notes</option><option value="rostering">Rostering</option><option value="performance">Performance</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Impact<select value={severity} onChange={(event) => setSeverity(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal text-ink"><option value="low">Minor</option><option value="normal">Normal</option><option value="high">Work blocked</option><option value="critical">Critical</option></select></label></div><label className="grid gap-2 text-sm font-semibold text-slate-700">Issue title<input required minLength={5} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal text-ink" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">What happened?<textarea required minLength={10} maxLength={4000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-md border border-slate-300 p-3 font-normal text-ink" /></label><button type="submit" disabled={busy} className="min-h-11 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{busy ? "Submitting..." : "Submit issue"}</button>{message ? <p className="text-sm font-semibold text-slate-700" role="status">{message}</p> : null}</form></Card>;
}
