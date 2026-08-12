"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { credentialTypes, getCredentialUrgency, getStaffCredentials, saveStaffCredential, type StaffCredential } from "@/lib/staff-credential-records";

export function StaffCredentialPanel() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [records, setRecords] = useState<StaffCredential[]>([]);
  const [staffInviteId, setStaffInviteId] = useState("");
  const [credentialType, setCredentialType] = useState(credentialTypes[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [warningDays, setWarningDays] = useState(30);
  const [message, setMessage] = useState("");

  async function load() {
    const [nextStaff, nextRecords] = await Promise.all([getTenantStaffInvites(), getStaffCredentials()]);
    setStaff(nextStaff); setRecords(nextRecords);
    setStaffInviteId((current) => current || nextStaff[0]?.id || "");
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!staffInviteId || !expiryDate) { setMessage("Choose a staff member and expiry date."); return; }
    const result = await saveStaffCredential({ staffInviteId, credentialType, referenceNumber: "", issuedDate: "", expiryDate, warningDays });
    setMessage(result.saved ? "Credential saved." : result.error || "Credential could not be saved.");
    if (result.saved) await load();
  }

  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Compliance</p><h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-ink"><ShieldCheck size={20} />Staff credentials</h2><p className="mt-2 text-sm text-slate-600">Track expiry dates and review warnings. Alerts are advisory and do not block shifts.</p></div><StatusBadge label={`${records.length} credentials`} tone="blue" /></div>
    <div className="mt-5 grid gap-3 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">Staff<select value={staffInviteId} onChange={(e) => setStaffInviteId(e.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3"><option value="">Select staff</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Credential<select value={credentialType} onChange={(e) => setCredentialType(e.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3">{credentialTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Expiry date<input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3" /></label>
      <label className="text-sm font-semibold text-slate-700">Warn before<select value={warningDays} onChange={(e) => setWarningDays(Number(e.target.value))} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3"><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label>
    </div>
    <button type="button" onClick={() => void save()} className="mt-4 min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white">Save credential</button>{message ? <p aria-live="polite" className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    <div className="mt-5 grid gap-3 md:grid-cols-2">{records.map((record) => { const urgency = getCredentialUrgency(record.expiryDate, record.warningDays); const member = staff.find((item) => item.id === record.staffInviteId); return <div key={record.id} className="rounded-md border border-slate-200 p-3"><div className="flex justify-between gap-3"><div><p className="font-semibold text-ink">{member?.name || "Staff member"}</p><p className="text-sm text-slate-600">{record.credentialType}</p></div><StatusBadge label={urgency.label} tone={urgency.tone} /></div><p className="mt-2 text-sm text-slate-600">Expires {new Date(`${record.expiryDate}T00:00:00`).toLocaleDateString("en-AU")}</p></div>; })}</div>
  </Card>;
}

