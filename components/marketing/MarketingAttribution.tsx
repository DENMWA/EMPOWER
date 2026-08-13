"use client";
import { usePathname } from "next/navigation";import { useEffect } from "react";import { trackMarketingEvent } from "@/lib/marketing/client";
const publicRoutes=new Set(["/","/features","/pricing","/contact","/signup"]);
export function MarketingAttribution(){const pathname=usePathname();useEffect(()=>{if(!publicRoutes.has(pathname))return;const event=pathname==="/pricing"?"pricing_view":pathname==="/features"?"feature_view":"page_view";void trackMarketingEvent(event)},[pathname]);return null}
