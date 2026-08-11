import { NextResponse } from "next/server";
import { hasPermission, resolveUserAccessContext } from "@/lib/security/user-access-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { filePath?: string; bucket?: string };
  const filePath = body.filePath?.trim() || "";
  const bucket = body.bucket || "participant-documents";
  const segments = filePath.split("/");
  const pathOrganisationId = segments[0] || "";
  const participantId = segments[1] || "";
  if (bucket !== "participant-documents" || !pathOrganisationId || !participantId) return notFound();

  const resolved = await resolveUserAccessContext(request, { organisationId: pathOrganisationId, participantId });
  if (!resolved.context || !hasPermission(resolved.context, "documents.view")) {
    console.warn(JSON.stringify({ event: "storage_scope_denied", actorUserId: resolved.context?.userId || "unknown", resourceId: participantId, endpoint: "/api/storage/sign", correlationId: resolved.correlationId, timestamp: new Date().toISOString() }));
    return notFound();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Private file access is unavailable." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const documentResponse = await fetch(`${url}/rest/v1/documents?select=id,visibility&organisation_id=eq.${resolved.context.organisationId}&participant_id=eq.${participantId}&file_path=eq.${encodeURIComponent(filePath)}&limit=1`, { headers, cache: "no-store" });
  const documents = documentResponse.ok ? await documentResponse.json() as Array<{ id: string; visibility: string }> : [];
  const directCareMedia = segments[2] === "profile-photo" || segments[2]?.startsWith("shift-note-evidence-");
  if (!documents[0] && !directCareMedia) return notFound();
  if (documents[0]?.visibility !== "worker-visible" && !hasPermission(resolved.context, "participants.view_sensitive")) return notFound();

  const signResponse = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encodeURI(filePath)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ expiresIn: 300 }),
    cache: "no-store"
  });
  if (!signResponse.ok) return notFound();
  const data = await signResponse.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = data.signedURL || data.signedUrl || "";
  if (!signedPath) return notFound();
  return NextResponse.json({ url: signedPath.startsWith("http") ? signedPath : `${url}${signedPath}`, expiresIn: 300 }, { headers: { "Cache-Control": "private, no-store" } });
}

function notFound() {
  return NextResponse.json({ error: "The requested file was not found." }, { status: 404 });
}
