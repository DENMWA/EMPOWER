import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedFields = new Set([
  "id", "name", "support_needs", "communication_preferences", "risk_alerts", "colour_scheme_id", "goals",
  "assigned_worker_ids", "primary_house_id", "primary_house_name", "service_name", "profile_photo_path", "ndis_number",
  "preferred_name", "date_of_birth", "pronouns", "address", "contact_phone", "contact_email", "diagnoses",
  "medical_conditions", "allergies", "medications", "behaviour_support_notes", "emergency_contacts", "key_worker_id", "status"
]);

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "people", "participants.view_sensitive");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input || !uuidPattern.test(String(input.id || "")) || !String(input.name || "").trim()) {
    return NextResponse.json({ error: "Enter a valid client name and identifier." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Secure client saving is not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const clientId = String(input.id);
  const existingResponse = await fetch(`${url}/rest/v1/participants_or_clients?id=eq.${encodeURIComponent(clientId)}&select=id,organisation_id&limit=1`, { headers, cache: "no-store" });
  const existing = existingResponse.ok ? await existingResponse.json() as Array<{ organisation_id: string }> : [];
  if (existing[0] && existing[0].organisation_id !== access.organisationId) {
    return NextResponse.json({ error: "This client identifier belongs to another workspace." }, { status: 409 });
  }

  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowedFields.has(key)));
  const response = await fetch(`${url}/rest/v1/participants_or_clients?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...payload, id: clientId, name: String(input.name).trim(), organisation_id: access.organisationId })
  });
  if (!response.ok) {
    console.error("Verified client save failed", response.status, await response.text());
    return NextResponse.json({ error: "The client could not be saved to this workspace." }, { status: 502 });
  }
  const rows = await response.json() as Array<Record<string, unknown>>;
  const saved = rows[0];
  if (!saved) return NextResponse.json({ error: "The client save returned no record." }, { status: 502 });

  const houseId = typeof input.primary_house_id === "string" ? input.primary_house_id : "";
  if (houseId) {
    const houseResponse = await fetch(`${url}/rest/v1/service_locations?id=eq.${encodeURIComponent(houseId)}&organisation_id=eq.${encodeURIComponent(access.organisationId)}&select=id&limit=1`, { headers, cache: "no-store" });
    const houses = houseResponse.ok ? await houseResponse.json() as Array<{ id: string }> : [];
    if (!houses.length) return NextResponse.json({ error: "The selected house is not available in this workspace.", client: saved }, { status: 409 });
    const assignmentResponse = await fetch(`${url}/rest/v1/participant_house_assignments?organisation_id=eq.${encodeURIComponent(access.organisationId)}&participant_id=eq.${encodeURIComponent(clientId)}&house_id=eq.${encodeURIComponent(houseId)}&status=in.(active,scheduled)&select=id&limit=1`, { headers, cache: "no-store" });
    const assignments = assignmentResponse.ok ? await assignmentResponse.json() as Array<{ id: string }> : [];
    if (!assignments.length) {
      const created = await fetch(`${url}/rest/v1/participant_house_assignments`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ organisation_id: access.organisationId, participant_id: clientId, house_id: houseId, assignment_type: "primary", start_date: new Date().toISOString().slice(0, 10), status: "active" }) });
      if (!created.ok) return NextResponse.json({ error: "The client was saved, but the house assignment could not be secured.", client: saved }, { status: 502 });
    }
  }
  return NextResponse.json({ client: saved });
}
