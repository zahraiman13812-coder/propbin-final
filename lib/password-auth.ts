import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createUserSession, type User } from "@/lib/user-auth";

const scrypt = promisify(scryptCb);
const globalPool = globalThis as typeof globalThis & { __propinPasswordPool?: Pool };
const db = globalPool.__propinPasswordPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
if (!globalPool.__propinPasswordPool) db.on("error", error => console.error("Idle auth database connection error:", error.message));
globalPool.__propinPasswordPool = db;
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export function normalizePhone(s: string) {
  const n = s.trim().replace(/[۰-۹٠-٩]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(c) : '٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s-]/g, "");
  if (/^\+98[0-9]{10}$/.test(n)) return '0'+n.slice(3);
  if (/^98[0-9]{10}$/.test(n)) return '0'+n.slice(2);
  return n;
}
function validPhone(p: string) { return /^09\d{9}$/.test(p); }
function validPassword(p: string) { return p.length >= 12 && p.length <= 128; }
async function hashSecret(value: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(value,salt,64)) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function checkSecret(value: string, stored: string) {
  const [kind,salt,hex] = stored.split(':');
  if (kind !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const key = (await scrypt(value,salt,64)) as Buffer;
  return timingSafeEqual(key,Buffer.from(hex,'hex'));
}
const keyFor = (kind:string, v:string) => createHash('sha256').update(kind+':'+v).digest('hex');
async function throttle(identifier:string) {
  const result=await db.query(`INSERT INTO user_auth_attempts(identifier,attempts,first_attempt,blocked_until)
    VALUES($1,1,now(),null) ON CONFLICT(identifier) DO UPDATE SET
    attempts = CASE WHEN user_auth_attempts.first_attempt < now()-interval '15 minutes' THEN 1 ELSE user_auth_attempts.attempts+1 END,
    first_attempt = CASE WHEN user_auth_attempts.first_attempt < now()-interval '15 minutes' THEN now() ELSE user_auth_attempts.first_attempt END,
    blocked_until = CASE WHEN user_auth_attempts.first_attempt >= now()-interval '15 minutes' AND user_auth_attempts.attempts >= 9 THEN now()+interval '15 minutes' ELSE user_auth_attempts.blocked_until END
    RETURNING blocked_until`,[identifier]);
  if (result.rows[0]?.blocked_until && new Date(result.rows[0].blocked_until).getTime() > Date.now()) throw new Error('درخواست‌های زیادی انجام شده؛ ۱۵ دقیقه بعد تلاش کنید.');
}
type Row={id:string;email:string;name:string;created_at:string;password_hash:string|null;recovery_hash:string|null;session_version:number};
function userOf(r:Row):User {return {id:r.id,email:r.email,name:r.name,createdAt:r.created_at};}
export async function register(input:{email:string;phone:string;name:string;password:string}) {
  const email=normalizeEmail(input.email), phone=normalizePhone(input.phone), name=input.name.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!validPhone(phone)||name.length<2||name.length>80||!validPassword(input.password)) throw new Error('نام، ایمیل، موبایل یا رمز عبور معتبر نیست (رمز حداقل ۱۲ کاراکتر).');
  await throttle(keyFor('register',email));
  const passwordHash=await hashSecret(input.password);
  const recoveryHash=null;
  try {
    const result=await db.query(`INSERT INTO site_users(email,phone,name,password_hash,recovery_hash)
      VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,created_at`,[email,phone,name,passwordHash,recoveryHash]);
    return {user:userOf(result.rows[0])};
  }catch(e:unknown){if((e as {code?:string}).code==='23505')throw new Error('ایمیل یا شماره موبایل قبلاً ثبت شده است.');throw e;}
}
export async function login(identifier:string,password:string) {
  const id=identifier.includes('@')?normalizeEmail(identifier):normalizePhone(identifier);
  if (!id || !password) throw new Error('ایمیل یا موبایل و رمز عبور را وارد کنید.');
  await throttle(keyFor('login',id));
  const result=await db.query('SELECT id,email,name,created_at,password_hash,session_version FROM site_users WHERE email=$1 OR phone=$1 LIMIT 1',[id]);
  const row=result.rows[0] as Row|undefined;
  // Equal-cost fake verification even when the email is unknown.
  const fake='scrypt:00000000000000000000000000000000:'+ '0'.repeat(128);
  const valid=await checkSecret(password,row?.password_hash||fake);
  if(!row||!valid)throw new Error('اطلاعات ورود صحیح نیست.');
  return {user:userOf(row),version:row.session_version};
}
export async function resetPassword(input:{email:string;phone:string;newPassword:string}) {
  const email=normalizeEmail(input.email),phone=normalizePhone(input.phone);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validPhone(phone)||!validPassword(input.newPassword))throw new Error('اطلاعات بازیابی معتبر نیست.');
  await throttle(keyFor('reset',email));
  // WARNING: Knowledge of email and phone does not prove account ownership.
  // For production, use a verified email/SMS challenge before resetting passwords.
  const newHash=await hashSecret(input.newPassword);
  const updated=await db.query(`UPDATE site_users SET password_hash=$1,recovery_hash=NULL,session_version=session_version+1
    WHERE email=$2 AND phone=$3 RETURNING id,email,name,created_at,session_version`,[newHash,email,phone]);
  if(!updated.rowCount)throw new Error('ایمیل یا شماره تلفن با اطلاعات ثبت‌شده مطابقت ندارد.');
  return {user:userOf(updated.rows[0]),version:updated.rows[0].session_version};
}
