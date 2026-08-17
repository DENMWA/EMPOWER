import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await verifyServerAccess(request, "admin", "scheduling", "rostering.manage");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!url || !key || !resend) return NextResponse.json({ error: "Roster offer delivery is not configured." }, { status: 503 });
  const body = await request.json() as { shiftId?: string; staffInviteId?: string };
  if (!body.shiftId || !body.staffInviteId) return NextResponse.json({ error: "Choose a shift and staff member." }, { status: 400 });
  const headers = serviceHeaders(key);
  const [shift] = await rows<ShiftRow>(url, headers, `support_shifts?select=id,start_time,end_time,location,staffing_ratio,status&organisation_id=eq.${access.organisationId}&id=eq.${encodeURIComponent(body.shiftId)}&limit=1`);
  const [staff] = await rows<{ id: string; name: string; email: string; invite_status: string }>(url, headers, `staff_invites?select=id,name,email,invite_status&organisation_id=eq.${access.organisationId}&id=eq.${encodeURIComponent(body.staffInviteId)}&limit=1`);
  if (!shift || !staff || staff.invite_status.toLowerCase() === "suspended") return NextResponse.json({ error: "The selected shift or staff member is unavailable." }, { status: 404 });
  if ((shift.staffing_ratio || "1:1") !== "1:1") return NextResponse.json({ error: "Multi-staff replacement requires manager assignment in the roster." }, { status: 409 });
  if (await hasConflict(url, headers, access.organisationId, staff.id, shift)) return NextResponse.json({ error: "This staff member now has an overlapping shift." }, { status: 409 });

  const token = randomBytes(32).toString("hex");
  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const inserted = await write<{ id: string }>(url, headers, "roster_replacement_offers", {
    organisation_id: access.organisationId, shift_id: shift.id, staff_invite_id: staff.id, token_hash: tokenHash,
    status: "pending", delivery_channel: "email", offered_by: access.userId, expires_at: expiresAt
  });
  if (!inserted[0]?.id) return NextResponse.json({ error: "The replacement offer could not be prepared." }, { status: 502 });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const reviewUrl = `${appUrl}/api/roster/replacement-offers/respond?token=${token}`;
  const date = new Date(shift.start_time).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric", month: "short" });
  const time = new Date(shift.start_time).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit" });
  const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" }, body: JSON.stringify({
    from: process.env.RESEND_FROM_EMAIL || "EmpowerNotes <notifications@empowernotes.org>", to: [staff.email], subject: "EmpowerNotes shift offer",
    html: offerHtml(staff.name, `${date} at ${time}`, shift.location || "Service location", reviewUrl, reviewUrl)
  }) });
  const delivery = await safeJson<{ id?: string }>(sent);
  if (!sent.ok || !delivery.id) {
    await patch(url, headers, `roster_replacement_offers?id=eq.${inserted[0].id}`, { status: "withdrawn" });
    return NextResponse.json({ error: "The offer was prepared but could not be delivered." }, { status: 502 });
  }
  await patch(url, headers, `roster_replacement_offers?id=eq.${inserted[0].id}`, { delivery_reference: delivery.id });
  return NextResponse.json({ ok: true, expiresAt });
}

type ShiftRow = { id: string; start_time: string; end_time: string; location: string | null; staffing_ratio: string | null; status: string };
function serviceHeaders(key: string) { return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }; }
async function rows<T>(url: string, headers: Record<string,string>, path: string): Promise<T[]> { const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" }); return response.ok ? await response.json() as T[] : []; }
async function write<T>(url: string, headers: Record<string,string>, path: string, body: unknown): Promise<T[]> { const response = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(body) }); return response.ok ? await response.json() as T[] : []; }
async function patch(url: string, headers: Record<string,string>, path: string, body: unknown) { return fetch(`${url}/rest/v1/${path}`, { method: "PATCH", headers, body: JSON.stringify(body) }); }
async function safeJson<T>(response: Response): Promise<T> { try { return await response.json() as T; } catch { return {} as T; } }
function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function hasConflict(url: string, headers: Record<string,string>, organisationId: string, staffInviteId: string, candidate: ShiftRow) {
  const assignments = await rows<{ shift_id: string }>(url, headers, `shift_staff?select=shift_id&organisation_id=eq.${organisationId}&staff_invite_id=eq.${staffInviteId}`);
  if (!assignments.length) return false;
  const ids = assignments.map((item) => item.shift_id).join(",");
  const shifts = await rows<ShiftRow>(url, headers, `support_shifts?select=id,start_time,end_time,location,staffing_ratio,status&id=in.(${ids})&status=not.in.(cancelled,no_show)`);
  const start = new Date(candidate.start_time).getTime(), end = new Date(candidate.end_time).getTime();
  return shifts.some((item) => item.id !== candidate.id && new Date(item.start_time).getTime() < end && new Date(item.end_time).getTime() > start);
}
function offerHtml(name: string, timing: string, location: string, yes: string, no: string) { return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:30px;color:#17212b"><div style="max-width:560px;margin:auto;background:white;border:1px solid #dfe5e9;padding:28px"><h2 style="color:#087f73">EmpowerNotes</h2><h1 style="font-size:24px">Shift coverage offer</h1><p>Hello ${escapeHtml(name)}, are you available for a shift on <strong>${escapeHtml(timing)}</strong> at ${escapeHtml(location)}?</p><p>This offer expires in 10 minutes and remains subject to manager confirmation.</p><p><a href="${yes}" style="display:inline-block;background:#087f73;color:white;padding:12px 22px;text-decoration:none;margin-right:10px">Y · Accept</a><a href="${no}" style="display:inline-block;border:1px solid #94a3b8;color:#17212b;padding:11px 22px;text-decoration:none">N · Decline</a></p><p style="font-size:12px;color:#64748b">No client or clinical information is included in this message.</p></div></body></html>`; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] || character); }
