import { NextRequest,NextResponse } from "next/server";
import { changeAdminPassword,sessionCookie } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!validOrigin(req))return NextResponse.json({error:"درخواست نامعتبر"},{status:403});
 const body=await req.json().catch(()=>({}));
 if(typeof body.currentPassword!=="string"||typeof body.newPassword!=="string")return NextResponse.json({error:"ورودی نامعتبر"},{status:400});
 try{
  const result=await changeAdminPassword(body.currentPassword,body.newPassword);
  if(!result.ok)return NextResponse.json({error:result.error},{status:400});
  const res=NextResponse.json({ok:true});
  res.cookies.set(sessionCookie.name,"",{...sessionCookie.options,maxAge:0});
  return res;
 }catch{return NextResponse.json({error:"ذخیره رمز انجام نشد؛ گزارش سرور را بررسی کنید."},{status:500});}
}
