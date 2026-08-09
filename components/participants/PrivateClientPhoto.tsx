"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getTenantDocumentDownloadUrl } from "@/lib/document-records";
import { cn } from "@/lib/utils";

export function PrivateClientPhoto({ path, alt, fallback, className }: { path?: string; alt: string; fallback: string; className?: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!path) return;
    getTenantDocumentDownloadUrl(path).then((result) => {
      if (active && result.url) setUrl(result.url);
    });
    return () => { active = false; };
  }, [path]);

  return (
    <div className={cn("grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 font-bold", className)}>
      {url ? <Image src={url} alt={alt} width={96} height={96} unoptimized className="h-full w-full object-cover" /> : fallback}
    </div>
  );
}
