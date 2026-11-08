import { NextRequest,NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
export const runtime="nodejs";export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(){if(!await isAdmin())return NextResponse.json({error:"دسترسی غیرمجاز"},{status:401});try{const {data,error}=await getSupabaseAdmin().from("firm_questions").select("*").order("created_at",{ascending:false}).limit(500);if(error)throw error;return NextResponse.json({questions:data??[]});}catch(e){console.error(e);return NextResponse.json({error:"دریافت پرسش‌ها ناموفق بود"},{status:500});}}
export async function PATCH(req:NextRequest){if(!validOrigin(req)||!await isAdmin())return NextResponse.json({error:"دسترسی غیرمجاز"},{status:403});const b=await req.json().catch(()=>null);if(!uuid.test(b?.id??"")||typeof b?.approved!=="boolean")return NextResponse.json({error:"ورودی نامعتبر"},{status:400});const {error}=await getSupabaseAdmin().from("firm_questions").update({approved:b.approved}).eq("id",b.id);return NextResponse.json(error?{error:"خطا در ذخیره"}:{ok:true},{status:error?500:200});}
export async function DELETE(req:NextRequest){if(!validOrigin(req)||!await isAdmin())return NextResponse.json({error:"دسترسی غیرمجاز"},{status:403});const b=await req.json().catch(()=>null);if(!uuid.test(b?.id??""))return NextResponse.json({error:"شناسه نامعتبر"},{status:400});const {error}=await getSupabaseAdmin().from("firm_questions").delete().eq("id",b.id);return NextResponse.json(error?{error:"حذف ناموفق"}:{ok:true},{status:error?500:200});}
