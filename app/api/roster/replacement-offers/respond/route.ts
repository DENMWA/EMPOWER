import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const accepted = request.nextUrl.searchParams.get("answer") === "yes";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || token.length < 32) return page("This offer link is invalid.", false, 400);
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const response = await fetch(`${url}/rest/v1/roster_replacement_offers?select=id,organisation_id,shift_id,staff_invite_id,status,expires_at&token_hash=eq.${tokenHash}&limit=1`, { headers, cache: "no-store" });
  const offers = response.ok ? await response.json() as OfferRow[] : [];
  const offer = offers[0];
  if (!offer || offer.status !== "pending") return page("This offer has already been answered or withdrawn.", false, 409);
  if (new Date(offer.expires_at).getTime() <= Date.now()) {
    await patch(url, headers, `roster_replacement_offers?id=eq.${offer.id}&status=eq.pending`, { status: "expired", responded_at: new Date().toISOString() });
    return page("This offer has expired. The roster has not changed.", false, 410);
  }
  if (!accepted) {
    await patch(url, headers, `roster_replacement_offers?id=eq.${offer.id}&status=eq.pending`, { status: "declined", responded_at: new Date().toISOString() });
    return page("Thank you. The shift has been declined and the roster has not changed.", true);
  }
  const targetShifts = await getRows<{id:string;start_time:string;end_time:string}>(url, headers, `support_shifts?select=id,start_time,end_time&id=eq.${offer.shift_id}&organisation_id=eq.${offer.organisation_id}&limit=1`);
  const assignments = await getRows<{shift_id:string}>(url, headers, `shift_staff?select=shift_id&organisation_id=eq.${offer.organisation_id}&staff_invite_id=eq.${offer.staff_invite_id}`);
  if (targetShifts[0] && assignments.length) {
    const assignedShifts = await getRows<{id:string;start_time:string;end_time:string}>(url, headers, `support_shifts?select=id,start_time,end_time&id=in.(${assignments.map((item)=>item.shift_id).join(",")})&status=not.in.(cancelled,no_show)`);
    const start = new Date(targetShifts[0].start_time).getTime(), end = new Date(targetShifts[0].end_time).getTime();
    if (assignedShifts.some((item)=>item.id!==offer.shift_id&&new Date(item.start_time).getTime()<end&&new Date(item.end_time).getTime()>start)) return page("This shift now conflicts with another assignment. The roster has not changed.", false, 409);
  }
  const claimed = await patchRows<OfferRow>(url, headers, `roster_replacement_offers?id=eq.${offer.id}&status=eq.pending`, { status: "accepted", responded_at: new Date().toISOString() });
  if (!claimed[0]) return page("Another response was processed first. The roster has not changed.", false, 409);
  const staffRows = await getRows<{ id:string; email:string }>(url, headers, `staff_invites?select=id,email&id=eq.${offer.staff_invite_id}&organisation_id=eq.${offer.organisation_id}&limit=1`);
  const users = staffRows[0] ? await getRows<{ id:string }>(url, headers, `users?select=id&organisation_id=eq.${offer.organisation_id}&email=eq.${encodeURIComponent(staffRows[0].email)}&limit=1`) : [];
  const assignment = await fetch(`${url}/rest/v1/shift_staff`, { method: "POST", headers, body: JSON.stringify({ organisation_id: offer.organisation_id, shift_id: offer.shift_id, staff_user_id: users[0]?.id || null, staff_invite_id: offer.staff_invite_id, role: "replacement worker", status: "assigned" }) });
  if (!assignment.ok) {
    await patch(url, headers, `roster_replacement_offers?id=eq.${offer.id}`, { status: "pending", responded_at: null });
    return page("The response was received, but manager assistance is required before the roster changes.", false, 502);
  }
  await fetch(`${url}/rest/v1/shift_staff?organisation_id=eq.${offer.organisation_id}&shift_id=eq.${offer.shift_id}&staff_invite_id=neq.${offer.staff_invite_id}`, { method: "DELETE", headers });
  await patch(url, headers, `support_shifts?id=eq.${offer.shift_id}&organisation_id=eq.${offer.organisation_id}`, { status: "scheduled", updated_at: new Date().toISOString() });
  await patch(url, headers, `roster_replacement_offers?organisation_id=eq.${offer.organisation_id}&shift_id=eq.${offer.shift_id}&status=eq.pending`, { status: "withdrawn" });
  return page("Accepted. The roster has been updated and the manager can now review the assignment.", true);
}

type OfferRow={id:string;organisation_id:string;shift_id:string;staff_invite_id:string;status:string;expires_at:string};
async function getRows<T>(url:string,headers:Record<string,string>,path:string):Promise<T[]>{const response=await fetch(`${url}/rest/v1/${path}`,{headers,cache:"no-store"});return response.ok?await response.json() as T[]:[];}
async function patch(url:string,headers:Record<string,string>,path:string,body:unknown){return fetch(`${url}/rest/v1/${path}`,{method:"PATCH",headers,body:JSON.stringify(body)});}
async function patchRows<T>(url:string,headers:Record<string,string>,path:string,body:unknown):Promise<T[]>{const response=await fetch(`${url}/rest/v1/${path}`,{method:"PATCH",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify(body)});return response.ok?await response.json() as T[]:[];}
function page(message:string,ok:boolean,status=200){return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:40px;color:#17212b"><main style="max-width:560px;margin:auto;background:white;border:1px solid #dfe5e9;padding:32px"><h2 style="color:#087f73">EmpowerNotes</h2><h1>${ok?"Response recorded":"Offer unavailable"}</h1><p style="line-height:1.6">${message}</p><p>You may close this page.</p></main></body></html>`,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});}
