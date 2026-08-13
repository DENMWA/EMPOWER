import { NextResponse } from "next/server";
import { checkOfficialNdisPricing, getNdisPricingMonitorState, publishPlatformNdisPricing } from "@/lib/ndis-pricing-monitor";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config() { const url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY; return url&&serviceKey?{url,serviceKey}:null; }
export async function GET(request:Request){const access=await verifyServerAccess(request,"platform");if(!access.allowed)return NextResponse.json({error:access.reason},{status:access.status});const db=config();if(!db)return NextResponse.json({error:"Pricing monitoring is not configured."},{status:503});try{return NextResponse.json(await getNdisPricingMonitorState(db));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Pricing status could not be loaded."},{status:500});}}
export async function POST(request:Request){const access=await verifyServerAccess(request,"platform");if(!access.allowed)return NextResponse.json({error:access.reason},{status:access.status});const db=config();if(!db)return NextResponse.json({error:"Pricing monitoring is not configured."},{status:503});try{const body=await request.json().catch(()=>({})) as {action?:string;versionId?:string};if(body.action==="publish"&&body.versionId)return NextResponse.json(await publishPlatformNdisPricing(db,body.versionId,access.userId));if(body.action==="check")return NextResponse.json(await checkOfficialNdisPricing(db));return NextResponse.json({error:"Choose check or publish."},{status:400});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Pricing action failed."},{status:500});}}
