"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ClientRecord } from "@/lib/client-records";
import { getTenantDocumentPreviewUrl } from "@/lib/document-records";
import { cn } from "@/lib/utils";

export function PrivateClientPhoto({ path, alt, fallback, className }: { path?: string; alt: string; fallback: string; className?: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    setUrl("");
    if (!path) return;
    let previewUrl = "";
    getTenantDocumentPreviewUrl(path).then((result) => {
      previewUrl = result.url;
      if (active && previewUrl) {
        setUrl(previewUrl);
      } else if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    });
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [path]);

  return (
    <div className={cn("grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 font-bold", className)}>
      {url ? <Image src={url} alt={alt} width={96} height={96} unoptimized className="h-full w-full object-cover" /> : fallback}
    </div>
  );
}

export function ClientIdentity({ client, detail, className }: { client?: Pick<ClientRecord, "name" | "initials" | "preferredName" | "profilePhotoPath">; detail?: string; className?: string }) {
  if (!client) return null;
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <PrivateClientPhoto path={client.profilePhotoPath} alt={`${client.name} profile`} fallback={client.initials} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{client.preferredName || client.name}</p>
        {client.preferredName ? <p className="truncate text-xs text-slate-500">{client.name}</p> : null}
        {detail ? <p className="truncate text-xs text-slate-600">{detail}</p> : null}
      </div>
    </div>
  );
}
