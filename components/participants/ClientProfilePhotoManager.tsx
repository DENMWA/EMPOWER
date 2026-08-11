"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import type { ClientRecord } from "@/lib/client-records";
import { saveTenantClient } from "@/lib/client-records";
import { buildDocumentStoragePath, deleteTenantDocumentFile, uploadTenantDocumentFile } from "@/lib/document-records";
import { getCurrentOrganisationId } from "@/lib/supabase-rest";

export function ClientProfilePhotoManager({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function replacePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return setMessage("Choose a JPG, PNG or WebP image under 5 MB.");
    setBusy(true);
    setMessage("Uploading new photo...");
    const organisationId = await getCurrentOrganisationId();
    if (!organisationId) { setBusy(false); return setMessage("Your active organisation could not be verified."); }
    const nextPath = buildDocumentStoragePath({ organisationId, participantId: client.id, documentType: "profile-photo", fileName: file.name });
    const upload = await uploadTenantDocumentFile(file, nextPath);
    if (!upload.uploaded) { setBusy(false); return setMessage(upload.error); }
    const saved = await saveTenantClient({ ...client, profilePhotoPath: nextPath });
    if (!saved.savedToCloud) {
      await deleteTenantDocumentFile(nextPath);
      setBusy(false);
      return setMessage(saved.error || "The new photo could not be linked to the client.");
    }
    if (client.profilePhotoPath && client.profilePhotoPath !== nextPath) await deleteTenantDocumentFile(client.profilePhotoPath);
    await onSaved();
    setMessage("Profile photo updated.");
    setBusy(false);
  }

  async function removePhoto() {
    if (!client.profilePhotoPath) return;
    setBusy(true);
    setMessage("Removing photo...");
    const saved = await saveTenantClient({ ...client, profilePhotoPath: undefined });
    if (!saved.savedToCloud) { setBusy(false); return setMessage(saved.error || "The profile photo could not be removed."); }
    const deletion = await deleteTenantDocumentFile(client.profilePhotoPath);
    await onSaved();
    setMessage(deletion.deleted ? "Profile photo removed." : "Photo removed from the profile; the private file is queued for cleanup.");
    setBusy(false);
  }

  return <div className="rounded-md border border-slate-200 bg-white p-3">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void replacePhoto(event.target.files?.[0])} />
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-ink disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {client.profilePhotoPath ? "Replace photo" : "Add photo"}</button>
      {client.profilePhotoPath ? <button type="button" disabled={busy} onClick={() => void removePhoto()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-60"><Trash2 size={16} /> Remove photo</button> : null}
    </div>
    {message ? <p role="status" className="mt-2 text-xs font-semibold text-slate-600">{message}</p> : null}
  </div>;
}
