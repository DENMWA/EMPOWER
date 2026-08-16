import { NextResponse } from "next/server";
import { getPublicCapabilitiesPayload, getPublicPlans, publicCapabilities, publicProductProfile } from "@/lib/ai-discoverability";

const tools = [
  { name: "get_product_overview", description: "Return the public EmpowerNotes product overview and safety boundary.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_public_capabilities", description: "List publicly documented EmpowerNotes capabilities.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_public_plans", description: "List published EmpowerNotes subscription plans.", inputSchema: { type: "object", properties: {}, additionalProperties: false } }
] as const;

export function GET() {
  return NextResponse.json({ name: "EmpowerNotes public discovery MCP", status: "stub", transport: "streamable-http", endpoint: "/api/mcp", tools, dataBoundary: getPublicCapabilitiesPayload().dataBoundary }, { headers: publicHeaders() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string } } | null;
  if (!body || body.jsonrpc !== "2.0" || !body.method) return rpcError(body?.id ?? null, -32600, "Invalid JSON-RPC request.", 400);

  if (body.method === "initialize") {
    return rpcResult(body.id ?? null, { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "empowernotes-public-discovery", version: "1.0.0" } });
  }
  if (body.method === "notifications/initialized") return new Response(null, { status: 202, headers: publicHeaders() });
  if (body.method === "tools/list") return rpcResult(body.id ?? null, { tools });
  if (body.method === "tools/call") {
    const name = body.params?.name || "";
    const payload = name === "get_product_overview"
      ? { product: publicProductProfile, dataBoundary: getPublicCapabilitiesPayload().dataBoundary }
      : name === "list_public_capabilities"
        ? publicCapabilities
        : name === "list_public_plans"
          ? getPublicPlans()
          : null;
    if (!payload) return rpcError(body.id ?? null, -32602, "Unknown public discovery tool.", 400);
    return rpcResult(body.id ?? null, { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], structuredContent: payload, isError: false });
  }
  return rpcError(body.id ?? null, -32601, "Method not found.", 404);
}

function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: publicHeaders() });
}

function rpcError(id: string | number | null, code: number, message: string, status: number) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers: publicHeaders() });
}

function publicHeaders() {
  return { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };
}
