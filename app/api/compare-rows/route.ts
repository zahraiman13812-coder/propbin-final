import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{const {data,error}=await getSupabaseAdmin().from("firm_compare_rows").select("id,label,row_key,position,is_visible,values_json").order("position");if(error)throw error;return NextResponse.json({rows:data||[]},{headers:{"Cache-Control":"no-store"}});}catch(e){console.error("compare rows",e);return NextResponse.json({error:"خطا در دریافت ردیف‌های مقایسه"},{status:500});}}
