import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { firmSpecificationFields } from "@/lib/firm-specifications";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const standard = new Set(["rating","capital","profit","fee","code","discount","challenge","payout", ...firmSpecificationFields.map(f=>f.key)]);
const respond = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function guard(req: NextRequest) { return validOrigin(req) && await isAdmin(); }
export async function POST(req:NextRequest) {
  if(!await guard(req))return respond({error:"دسترسی غیرمجاز"},403);
  const b=await req.json().catch(()=>null);
  const label=typeof b?.label==="string"?b.label.trim():"";
  const rowKey=typeof b?.rowKey==="string"&&standard.has(b.rowKey)?b.rowKey:null;
  if(!label||label.length>80)return respond({error:"عنوان ردیف نامعتبر است"},400);
  const position=Number.isInteger(b.position)?Math.max(0,Math.min(9999,b.position)):1000;
  const {data,error}=await getSupabaseAdmin().from("firm_compare_rows").insert({label,row_key:rowKey,position,is_visible:true,values_json:{}}).select("id").maybeSingle();
  if(error){console.error("compare row insert",error);return respond({error:"ردیف قبلاً ثبت شده یا دیتابیس در دسترس نیست"},409);}
  return respond({ok:true,id:data?.id},201);
}
export async function PATCH(req:NextRequest) {
  if(!await guard(req))return respond({error:"دسترسی غیرمجاز"},403);
  const b=await req.json().catch(()=>null);
  if(!uuid.test(b?.id??""))return respond({error:"شناسه نامعتبر"},400);
  const patch:Record<string,unknown>={};
  if(typeof b.label==="string"&&b.label.trim().length>0&&b.label.length<=80)patch.label=b.label.trim();
  if(typeof b.isVisible==="boolean")patch.is_visible=b.isVisible;
  if(Number.isInteger(b.position)&&b.position>=0&&b.position<=9999)patch.position=b.position;
  if(b.values&&typeof b.values==="object"&&!Array.isArray(b.values)) {
    const vals:Record<string,string>={};
    for(const [id,val] of Object.entries(b.values))if(uuid.test(id)&&typeof val==="string")vals[id]=val.slice(0,300);
    patch.values_json=vals;
  }
  if(!Object.keys(patch).length)return respond({error:"تغییری ارسال نشده"},400);
  const {error}=await getSupabaseAdmin().from("firm_compare_rows").update(patch).eq("id",b.id);
  if(error){console.error("compare row update",error);return respond({error:"ثبت تغییرات ناموفق بود"},500);}
  return respond({ok:true});
}
export async function DELETE(req:NextRequest) {
  if(!await guard(req))return respond({error:"دسترسی غیرمجاز"},403);
  const b=await req.json().catch(()=>null);
  if(!uuid.test(b?.id??""))return respond({error:"شناسه نامعتبر"},400);
  const {data,error}=await getSupabaseAdmin().from("firm_compare_rows").select("row_key").eq("id",b.id).maybeSingle();
  if(error||!data)return respond({error:"ردیف پیدا نشد"},404);
  if(data.row_key)return respond({error:"ردیف اصلی قابل حذف نیست؛ آن را مخفی کن"},400);
  const deleted=await getSupabaseAdmin().from("firm_compare_rows").delete().eq("id",b.id);
  return respond(deleted.error?{error:"حذف ناموفق بود"}:{ok:true},deleted.error?500:200);
}
