import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
const scrypt = promisify(scryptCb);
const COOKIE="parabin_admin";
const EXPIRES=86400;
const secret=()=>process.env.ADMIN_SESSION_SECRET||"";
const sign=(value:string)=>createHmac("sha256",secret()).update(value).digest("hex");
export function isConfigured(){return Boolean(process.env.ADMIN_PASSWORD && secret().length>=32);}
function safeEqual(a:string,b:string){const x=createHmac("sha256",secret()).update(a).digest();const y=createHmac("sha256",secret()).update(b).digest();return timingSafeEqual(x,y);}
type CredentialRow={password_hash:string|null;session_version:number};
async function credential():Promise<CredentialRow>{
 const {data,error}=await getSupabaseAdmin().from("admin_credentials").select("password_hash,session_version").eq("id",1).single();
 if(error || !data)throw new Error("جدول admin_credentials در Supabase در دسترس نیست؛ SQL مرحله ۱۱ را اجرا کنید.");
 return data as CredentialRow;
}
export async function hashAdminPassword(password:string){
 const salt=randomBytes(16).toString("hex");
 const hash=(await scrypt(password,Buffer.from(salt,"hex"),64)) as Buffer;
 return `scrypt$${salt}$${hash.toString("hex")}`;
}
async function verifyHash(candidate:string,stored:string){
 const [alg,salt,hex]=stored.split("$");
 if(alg!=="scrypt"||!/^[a-f0-9]{32}$/.test(salt||"")||!/^[a-f0-9]{128}$/.test(hex||""))return false;
 const derived=(await scrypt(candidate,Buffer.from(salt,"hex"),64)) as Buffer;
 return timingSafeEqual(derived,Buffer.from(hex,"hex"));
}
export async function passwordMatches(candidate:string,row?:CredentialRow){
 if(typeof candidate!=="string" || !candidate.length || candidate.length>128)return false;
 if(!isConfigured())return false;
 const current=row??await credential();
 return current.password_hash?verifyHash(candidate,current.password_hash):safeEqual(candidate,process.env.ADMIN_PASSWORD!);
}
export async function isAdmin(){
 if(!isConfigured())return false;
 const token=(await cookies()).get(COOKIE)?.value;
 if(!token)return false;
 const parts=token.split(".");
 if(parts.length!==3)return false;
 const [stamp,version,mac]=parts;
 if(!stamp||!version||!mac||!/^[0-9]+$/.test(stamp)||!/^[0-9]+$/.test(version)||!/^[a-f0-9]{64}$/.test(mac))return false;
 const age=Math.floor(Date.now()/1000)-Number(stamp);
 if(age<0||age>EXPIRES)return false;
 const expected=sign(`${stamp}.${version}`);
 if(!timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(expected,"hex")))return false;
 const row=await credential();
 return row.session_version===Number(version);
}
export async function authenticateAdmin(candidate:string):Promise<string|null>{
 if(!isConfigured())return null;
 const row=await credential();
 if(!(await passwordMatches(candidate,row)))return null;
 // Bind to the version whose password was checked, even during a password change.
 const payload=`${Math.floor(Date.now()/1000)}.${row.session_version}`;
 return `${payload}.${sign(payload)}`;
}
export async function newSession(){
 const row=await credential();
 const stamp=String(Math.floor(Date.now()/1000));
 const payload=`${stamp}.${row.session_version}`;
 return `${payload}.${sign(payload)}`;
}
export async function changeAdminPassword(current:string,next:string){
 if(!isConfigured()||!(await isAdmin()))return {ok:false,error:"نشست مدیریت معتبر نیست."};
 if(typeof next!=="string"||next.length<12||next.length>128)return {ok:false,error:"رمز جدید باید بین ۱۲ تا ۱۲۸ کاراکتر باشد."};
 if(current===next)return {ok:false,error:"رمز جدید باید متفاوت باشد."};
 const row=await credential();
 if(!(await passwordMatches(current,row)))return {ok:false,error:"رمز فعلی اشتباه است."};
 const password_hash=await hashAdminPassword(next);
 const {data,error}=await getSupabaseAdmin().from("admin_credentials")
 .update({password_hash,session_version:row.session_version+1,updated_at:new Date().toISOString()})
 .eq("id",1).eq("session_version",row.session_version)
 .select("session_version").maybeSingle();
 if(error)throw new Error("ذخیره رمز جدید در Supabase ناموفق بود.");
 if(!data)return {ok:false,error:"رمز در نشست دیگری تغییر کرده است؛ دوباره وارد شوید."};
 return {ok:true};
}
export const sessionCookie={name:COOKIE,options:{httpOnly:true,sameSite:"strict" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:EXPIRES}};
