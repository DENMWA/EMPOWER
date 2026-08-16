import { NextResponse, type NextRequest } from "next/server";
import { maintenanceMessage } from "@/lib/maintenance";

const readOnlyPostRoutes = [
  "/api/access/",
  "/api/auth/access",
  "/api/billing/invoice-pdf",
  "/api/diagnostics/",
  "/api/storage/sign"
];
const operationalRoutes = ["/api/cron/", "/api/stripe/webhook"];

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_READ_ONLY_MAINTENANCE !== "true") return NextResponse.next();
  if (!request.nextUrl.pathname.startsWith("/api/") || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  if ([...readOnlyPostRoutes, ...operationalRoutes].some((path) => request.nextUrl.pathname.startsWith(path))) return NextResponse.next();
  return NextResponse.json({ error: maintenanceMessage, maintenance: true }, { status: 503, headers: { "Retry-After": "900", "Cache-Control": "no-store" } });
}

export const config = { matcher: "/api/:path*" };
