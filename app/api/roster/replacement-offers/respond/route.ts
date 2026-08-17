import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lookup = await findOffer(request.nextUrl.searchParams.get("token") || "");
  if (!lookup.ok) return page(lookup.message, false, lookup.status);
  return confirmationPage(lookup.token);
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") || "");
  const answer = String(form?.get("answer") || "");
  if (!new Set(["yes", "no"]).has(answer)) return page("Choose accept or decline.", false, 400);
  const lookup = await findOffer(token);
  if (!lookup.ok) return page(lookup.message, false, lookup.status);
  const { url, headers, offer } = lookup;

  if (answer === "no") {
    const declined = await patchRows<OfferRow>(url, headers, `roster_replacement_offers?id=eq.${offer.id}&status=eq.pending`, { status: "declined", responded_at: new Date().toISOString() });
    return declined[0] ? page("Thank you. The shift has been declined and the roster has not changed.", true) : page("Another response was processed first. The roster has not changed.", false, 409);
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
type OfferLookup = { ok:true;token:string;url:string;headers:Record<string,string>;offer:OfferRow } | { ok:false;message:string;status:number };
async function findOffer(token:string):Promise<OfferLookup>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key||token.length<32)return{ok:false,message:"This offer link is invalid.",status:400};
  const headers={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const offers=await getRows<OfferRow>(url,headers,`roster_replacement_offers?select=id,organisation_id,shift_id,staff_invite_id,status,expires_at&token_hash=eq.${tokenHash}&limit=1`);
  const offer=offers[0];
  if(!offer||offer.status!=="pending")return{ok:false,message:"This offer has already been answered or withdrawn.",status:409};
  if(new Date(offer.expires_at).getTime()<=Date.now())return{ok:false,message:"This offer has expired. The roster has not changed.",status:410};
  return{ok:true,token,url,headers,offer};
}
async function getRows<T>(url:string,headers:Record<string,string>,path:string):Promise<T[]>{const response=await fetch(`${url}/rest/v1/${path}`,{headers,cache:"no-store"});return response.ok?await response.json() as T[]:[];}
async function patch(url:string,headers:Record<string,string>,path:string,body:unknown){return fetch(`${url}/rest/v1/${path}`,{method:"PATCH",headers,body:JSON.stringify(body)});}
async function patchRows<T>(url:string,headers:Record<string,string>,path:string,body:unknown):Promise<T[]>{const response=await fetch(`${url}/rest/v1/${path}`,{method:"PATCH",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify(body)});return response.ok?await response.json() as T[]:[];}
function confirmationPage(token:string){const safe=escapeHtml(token);return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:40px;color:#17212b"><main style="max-width:560px;margin:auto;background:white;border:1px solid #dfe5e9;padding:32px"><h2 style="color:#087f73">EmpowerNotes</h2><h1>Respond to shift offer</h1><p>Review your availability, then confirm one response below. The roster will not change until you submit.</p><form method="post"><input type="hidden" name="token" value="${safe}"><button name="answer" value="yes" style="background:#087f73;color:white;border:0;padding:12px 22px;margin-right:10px">Accept shift</button><button name="answer" value="no" style="background:white;color:#17212b;border:1px solid #94a3b8;padding:11px 22px">Decline</button></form></main></body></html>`,{headers:secureHeaders()});}
function page(message:string,ok:boolean,status=200){return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:40px;color:#17212b"><main style="max-width:560px;margin:auto;background:white;border:1px solid #dfe5e9;padding:32px"><h2 style="color:#087f73">EmpowerNotes</h2><h1>${ok?"Response recorded":"Offer unavailable"}</h1><p style="line-height:1.6">${escapeHtml(message)}</p><p>You may close this page.</p></main></body></html>`,{status,headers:secureHeaders()});}
function secureHeaders(){return{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[character]||character);}
