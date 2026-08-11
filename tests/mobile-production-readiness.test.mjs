import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(`../${path}`, import.meta.url), "utf8"); }

test("mobile voice records audio and transcribes server-side with explicit failure states", async () => {
  const [recorder, route, guard, limits] = await Promise.all([
    source("components/voice/VoiceRecorder.tsx"), source("app/api/ai/transcribe-note/route.ts"), source("lib/security/ai-request-guard.ts"), source("supabase/ai-api-rate-limits.sql")
  ]);
  assert.match(recorder, /getUserMedia/);
  assert.match(recorder, /new MediaRecorder/);
  assert.match(recorder, /audio\/mp4/);
  assert.match(recorder, /NotAllowedError/);
  assert.match(recorder, /NotFoundError/);
  assert.match(recorder, /audio\/mp4/);
  assert.match(recorder, /cancelRecording/);
  assert.match(recorder, /formatElapsed/);
  assert.match(recorder, /Record progress note/);
  assert.match(recorder, /tracks\(\)\.forEach|Tracks\(\)\.forEach|getTracks\(\)\.forEach/);
  assert.match(route, /audio\/transcriptions/);
  assert.match(route, /25 \* 1024 \* 1024/);
  assert.match(guard, /transcribe_note/);
  assert.match(limits, /when 'transcribe_note'/);
});

test("tenant photo cache and every storage operation are organisation scoped", async () => {
  const [cache, supabase, documents, photo, manager, policy] = await Promise.all([
    source("lib/tenant-storage.ts"), source("lib/supabase-rest.ts"), source("lib/document-records.ts"), source("components/participants/PrivateClientPhoto.tsx"), source("components/participants/ClientProfilePhotoManager.tsx"), source("supabase/client-and-note-photos.sql")
  ]);
  assert.match(cache, /getCachedOrganisationId/);
  assert.match(cache, /organisation-unresolved/);
  assert.match(supabase, /active-organisation:/);
  assert.match(supabase, /activeOrganisationUpdatedEvent/);
  assert.ok((documents.match(/validateTenantStoragePath\(filePath\)/g) || []).length >= 4);
  assert.match(documents, /pathOrganisationId !== organisationId/);
  assert.match(photo, /activeOrganisationUpdatedEvent/);
  assert.match(photo, /URL\.revokeObjectURL/);
  assert.ok(manager.indexOf("saveTenantClient({ ...client, profilePhotoPath: nextPath })") < manager.indexOf("deleteTenantDocumentFile(client.profilePhotoPath)"));
  assert.ok(manager.indexOf("saveTenantClient({ ...client, profilePhotoPath: undefined })") < manager.lastIndexOf("deleteTenantDocumentFile(client.profilePhotoPath)"));
  assert.match(policy, /participant\.id::text = \(storage\.foldername\(name\)\)\[2\]/);
  assert.match(policy, /assigned_to_participant/);
  assert.match(policy, /for delete to authenticated/);
});

test("invoice UI is responsive while PDF export is server generated and tenant scoped", async () => {
  const [workspace, route, pdf] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"), source("app/api/billing/invoice-pdf/route.ts"), source("lib/invoice-pdf.ts")
  ]);
  assert.match(workspace, /hidden overflow-x-auto[\s\S]*md:block/);
  assert.match(workspace, /md:hidden/);
  assert.match(workspace, /break-words/);
  assert.match(route, /verifyServerAccess\(request, "admin", "billing"\)/);
  assert.ok((route.match(/organisation_id/g) || []).length >= 4);
  assert.match(route, /Content-Type": "application\/pdf/);
  assert.match(route, /Cache-Control": "private, no-store/);
  assert.match(pdf, /595\.28/);
  assert.match(pdf, /841\.89/);
  assert.match(pdf, /Page \$\{index \+ 1\} of \$\{pages\.length\}/);
  assert.match(pdf, /isGstFree/);
  assert.match(pdf, /wrapPdfText/);
  assert.match(pdf, /CreationDate/);
});
