import { validOrigin } from "@/lib/guard";
import { firmSpecificationFields } from "@/lib/firm-specifications";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getFirmDetails } from "@/lib/firm-details";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (x: unknown, n=6000) => typeof x === "string" ? x.trim().slice(0,n) : "";
function asEntries(x: unknown, fields: string[], limit: number) {
  if(!Array.isArray(x)) return [];
  return x.slice(0,limit).map(entry => {
    const obj = entry && typeof entry === "object" && !Array.isArray(entry) ? entry as Record<string,unknown> : {};
    return Object.fromEntries(fields.map(k => [k,str(obj[k],500)]));
  }).filter(item=>Object.values(item).some(Boolean));
}
function safeArray(x: unknown) { return Array.isArray(x) ? x.slice(0,30).map(v=>str(v,500)).filter(Boolean) : []; }
function normalize(x: unknown) {
  const o = x && typeof x === "object" && !Array.isArray(x) ? x as Record<string,unknown> : {};
  return { specifications:Object.fromEntries(firmSpecificationFields.map(f=>[f.key,str((o.specifications as Record<string,unknown> | undefined)?.[f.key],500)])), introduction:str(o.introduction),history:str(o.history),tradingRules:str(o.tradingRules),payoutRules:str(o.payoutRules),
    pros:safeArray(o.pros),cons:safeArray(o.cons),facts:asEntries(o.facts,["label","value"],40),
    plans:asEntries(o.plans,["name","size","price","target","dailyLoss","maxLoss"],50),
    faqs:asEntries(o.faqs,["question","answer"],30),discounts:asEntries(o.discounts,["code","amount","note"],30) };
}
const response=(obj:unknown,status=200)=>NextResponse.json(obj,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request:NextRequest) {
  if (!await isAdmin()) return response({error:"دسترسی غیرمجاز"},401);
  const id=request.nextUrl.searchParams.get("id")||"";
  if(!id) { const {data,error}=await getSupabaseAdmin().from("prop_firms").select("id,name").order("name"); return error?response({error:"دریافت فهرست شرکت‌ها ناموفق بود"},500):response({firms:data??[]}); }
  if(!idPattern.test(id)) return response({error:"شناسه شرکت نامعتبر است"},400);
  try{return response({details:await getFirmDetails(id)})}catch(e){console.error(e);return response({error:"دریافت اطلاعات شرکت ناموفق بود؛ ساختار دیتابیس را بررسی کنید"},500)}
}
export async function PUT(request:NextRequest) {
  if(!validOrigin(request) || !await isAdmin()) return response({error:"دسترسی غیرمجاز"},403);
  if(Number(request.headers.get("content-length")||0)>100000) return response({error:"حجم داده بیش از حد مجاز است"},413);
  const body=await request.json().catch(()=>null);
  if(!idPattern.test(body?.id||"") || !body?.details) return response({error:"ورودی نامعتبر"},400);
  try {
    const db=getSupabaseAdmin();
    const {data:firm,error:firmError}=await db.from("prop_firms").select("id").eq("id",body.id).maybeSingle();
    if(firmError||!firm)return response({error:"شرکت ثبت‌شده پیدا نشد"},404);
    const {error}=await db.from("firm_details").upsert({firm_id:body.id,content:normalize(body.details),updated_at:new Date().toISOString()},{onConflict:"firm_id"});
    if(error) throw error;
    return response({ok:true});
  }catch(e){console.error("firm details save error",e);return response({error:"ثبت اطلاعات ناموفق بود؛ Migration را اجرا کنید"},500)}
}
