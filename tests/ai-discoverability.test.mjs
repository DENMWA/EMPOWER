import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = (file) => readFile(path.join(root, file), "utf8");

test("AI discovery resources share a public-only product source", async () => {
  const [knowledge, llms, manifest, capabilities, openapi] = await Promise.all([
    source("lib/ai-discoverability.ts"), source("app/llms.txt/route.ts"),
    source("app/api/public/ai-manifest/route.ts"), source("app/api/public/capabilities/route.ts"),
    source("app/openapi.json/route.ts")
  ]);
  assert.match(knowledge, /publicProductProfile/);
  assert.match(knowledge, /publicDataBoundary/);
  assert.match(llms, /getLlmsText/);
  assert.match(manifest, /getAiManifest/);
  assert.match(capabilities, /getPublicCapabilitiesPayload/);
  assert.match(openapi, /getOpenApiDocument/);
  assert.doesNotMatch(knowledge, /from ["'][^"']*(supabase|client-records|incident-records|progress-note-records)|service_role/i);
});

test("the public OpenAPI document excludes private application endpoints", async () => {
  const knowledge = await source("lib/ai-discoverability.ts");
  assert.match(knowledge, /openapi: "3\.1\.0"/);
  assert.match(knowledge, /"\/api\/public\/capabilities"/);
  assert.match(knowledge, /"\/api\/mcp"/);
  for (const privatePath of ["/api/admin", "/api/ai", "/api/auth", "/api/billing", "/api/diagnostics", "/api/platform", "/api/storage", "/api/stripe", "/api/team"]) {
    assert.doesNotMatch(knowledge, new RegExp(`"${privatePath.replaceAll("/", "\\/")}`));
  }
});

test("the MCP stub is read-only and limited to public product knowledge", async () => {
  const mcp = await source("app/api/mcp/route.ts");
  assert.match(mcp, /get_product_overview/);
  assert.match(mcp, /list_public_capabilities/);
  assert.match(mcp, /list_public_plans/);
  assert.match(mcp, /body\.method === "initialize"/);
  assert.match(mcp, /body\.method === "tools\/list"/);
  assert.match(mcp, /body\.method === "tools\/call"/);
  assert.doesNotMatch(mcp, /supabase|participantId|organisationId|access_token|service_role/i);
});

test("marketing pages expose source-backed structured data and AI progress-note depth", async () => {
  const [layout, home, features, pricing, progress, sitemap, config, accessBoundary] = await Promise.all([
    source("app/layout.tsx"), source("app/page.tsx"), source("app/features/page.tsx"),
    source("app/pricing/page.tsx"), source("app/ai-progress-notes/page.tsx"),
    source("app/sitemap.ts"), source("next.config.mjs"), source("components/auth/DemoAccessBoundary.tsx")
  ]);
  assert.match(layout, /"@type": "Organization"/);
  assert.match(layout, /"@type": "WebSite"/);
  assert.match(home, /"@type": "SoftwareApplication"/);
  assert.match(features, /"@type": "ItemList"/);
  assert.match(pricing, /"@type": "Product"/);
  assert.match(progress, /"@type": "FAQPage"/);
  assert.match(progress, /Clear records\. Original facts\. Human control\./);
  assert.match(progress, /What remains human/);
  assert.match(sitemap, /\/ai-progress-notes/);
  assert.match(config, /source: "\/\.ai\/manifest\.json"/);
  assert.match(accessBoundary, /"\/ai-progress-notes"/);
});

test("discoverability architecture documents privacy and maintenance", async () => {
  const docs = await source("docs/AI_DISCOVERABILITY.md");
  assert.match(docs, /Source of truth/);
  assert.match(docs, /Privacy boundary/);
  assert.match(docs, /OpenAPI boundary/);
  assert.match(docs, /MCP evolution/);
  assert.match(docs, /must never import tenant data modules or access Supabase/);
});

test("SEO keeps public marketing indexable and private workspaces out of search", async () => {
  const [layout, robots, sitemap, privateMetadata, privateRosterLayout, socialImage, signin] = await Promise.all([
    source("app/layout.tsx"),
    source("app/robots.ts"),
    source("app/sitemap.ts"),
    source("lib/private-route-metadata.ts"),
    source("app/my-roster/layout.tsx"),
    source("app/opengraph-image.tsx"),
    source("app/signin/page.tsx")
  ]);
  assert.match(layout, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
  for (const route of ["/admin", "/api", "/dashboard", "/documents", "/handover", "/incidents", "/my-roster", "/notes", "/participants", "/platform"]) {
    assert.match(robots, new RegExp(`"${route.replaceAll("/", "\\/")}`));
  }
  assert.doesNotMatch(sitemap, /lastModified: new Date\(\)/);
  assert.match(privateMetadata, /index: false/);
  assert.match(privateMetadata, /noimageindex: true/);
  assert.match(privateRosterLayout, /privateRouteMetadata as metadata/);
  assert.match(socialImage, /new ImageResponse/);
  assert.match(socialImage, /1200/);
  assert.match(socialImage, /630/);
  assert.match(signin, /robots: \{ index: false, follow: false \}/);
});
