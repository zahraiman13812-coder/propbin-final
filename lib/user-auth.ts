import "server-only";

import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

const COOKIE = "parabin_user_session";

const CODE_LIFETIME = 10 * 60 * 1000;
const SESSION_LIFETIME = 7 * 24 * 60 * 60;
const DEMO_SESSION_LIFETIME = 4 * 60 * 60;

const LOCAL_DEMO_EMAIL = "demo@parabin.test";
const LOCAL_DEMO_CODE = "123456";

const DEMO_USER_ID = "parabin-demo-viewer";

export type AuthMode = "login" | "register";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type UserRow = { id: string; email: string; name: string; created_at: string };

function asUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}
function dbFail(error: unknown): never {
  console.error("User auth database error:", error);
  throw new Error("خطا در پایگاه داده کاربران.");
}

function isLocalDemo(email: string) {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_MOCK_LOGIN === "true" &&
    email === LOCAL_DEMO_EMAIL
  );
}

function demoEnabled() {
  return (
    process.env.DEMO_LOGIN_ENABLED === "true" &&
    typeof process.env.DEMO_ACCESS_CODE ===
      "string" &&
    process.env.DEMO_ACCESS_CODE.length >= 24
  );
}

function secret() {
  const value = process.env.USER_AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "USER_AUTH_SECRET تنظیم نشده است."
    );
  }

  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret())
    .update(value)
    .digest("hex");
}

function safeTextEqual(
  left: string,
  right: string
) {
  const leftHash = createHash("sha256")
    .update(left)
    .digest();

  const rightHash = createHash("sha256")
    .update(right)
    .digest();

  return timingSafeEqual(leftHash, rightHash);
}

export function isDemoUser(
  user: User | null
) {
  return user?.id === DEMO_USER_ID;
}

export function verifyDemoAccessCode(
  code: string
) {
  if (!demoEnabled()) {
    return false;
  }

  const configured =
    process.env.DEMO_ACCESS_CODE || "";

  return safeTextEqual(code, configured);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validEmail(email: string) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

/** An OTP is sent only after the database atomically reserves its rate-limit slot. */
export class LoginCodeThrottled extends Error {
  constructor() {
    super("درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کنید.");
    this.name = "LoginCodeThrottled";
  }
}

function generateOtp(): string {
  // Rejection-free uniform six-digit code via Node's CSPRNG.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function sendCodeEmail(to: string, code: string): Promise<void> {
  const subject = "کد یک‌بارمصرف ورود به پراپ‌بین";
  const text = `کد ورود شما: ${code}\nاعتبار: ۱۰ دقیقه\nاگر این درخواست را ثبت نکرده‌اید، این پیام را نادیده بگیرید.`;

  // Resend is the preferred provider when RESEND_API_KEY and MAIL_FROM are configured.
  // Gmail SMTP remains an optional fallback for environments without Resend.
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("OTP email provider failure, status:", response.status);
      throw new Error("ارسال ایمیل ناموفق بود. تنظیمات ایمیل را بررسی کنید.");
    }
    return;
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    throw new Error("تنظیمات ایمیل در سرور کامل نیست (GMAIL_USER / GMAIL_APP_PASSWORD).");
  }

  // Dependency: npm install nodemailer && npm install -D @types/nodemailer
  const { default: nodemailer } = await import("nodemailer");
  const smtp = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailAppPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000,
  });
  await smtp.sendMail({
    from: `"پراپ‌بین" <${gmailUser}>`, to, subject, text,
  });
}

export async function issueLoginCode(email: string, mode: AuthMode = "login", name = "") {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized)) throw new Error("ایمیل معتبر وارد کنید.");
  const displayName = name.trim().slice(0, 80);
  if (mode === "register" && displayName.length < 2) {
    throw new Error("نام باید بین ۲ تا ۸۰ کاراکتر باشد.");
  }

  const db = getSupabaseAdmin();
  const { data: user, error: userError } = await db.from("site_users")
    .select("id").eq("email", normalized).maybeSingle();
  if (userError) dbFail(userError);

  // A registration never silently overwrites an existing account.
  // A login never creates a new account without the user's name and consent.
  if (mode === "register" && user) {
    throw new Error("این ایمیل قبلاً ثبت شده است. از بخش ورود استفاده کنید.");
  }
  if (mode === "login" && !user) {
    throw new Error("این ایمیل هنوز ثبت نشده است. ابتدا ثبت‌نام کنید.");
  }

  const localTest = isLocalDemo(normalized);
  const code = localTest ? LOCAL_DEMO_CODE : generateOtp();
  const hash = sign(`otp:${normalized}:${code}`);
  const { data: reserved, error: reserveError } = await db.rpc("reserve_site_login_code", {
    p_email: normalized,
    p_hash: hash,
    p_mode: user ? "login" : "register",
    p_name: user ? null : (displayName || "کاربر پراپ‌بین"),
  });
  if (reserveError) dbFail(reserveError);
  if (!reserved) throw new LoginCodeThrottled();

  if (localTest) return;
  try {
    await sendCodeEmail(normalized, code);
  } catch (error) {
    // Invalidate this exact undelivered code; don't remove a newer request's code.
    const { error: deleteError } = await db.from("site_login_codes")
      .update({ hash: "undelivered", expires_at: new Date(0).toISOString(), attempts: 5 })
      .eq("email", normalized).eq("hash", hash);
    if (deleteError) console.error("OTP rollback failed:", deleteError.code);
    throw error;
  }
}

export async function verifyLoginCode(email: string, code: string): Promise<{ user: User; version: number } | null> {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized) || !/^\d{6}$/.test(code)) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("verify_site_login_code", {
    p_email: normalized,
    p_hash: sign(`otp:${normalized}:${code}`),
  });
  if (error) dbFail(error);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  const user = asUser(row as UserRow);
  const { data: current, error: currentError } = await db.from("site_users")
    .select("session_version").eq("id", user.id).maybeSingle();
  if (currentError || !current) dbFail(currentError || new Error("User disappeared"));
  return { user, version: Number(current.session_version) || 1 };
}

function createSession(
  id: string,
  lifetime: number,
  kind: "user" | "demo",
  version = 1
) {
  const payload = Buffer.from(
    JSON.stringify({
      id,
      kind,
      version,
      exp:
        Math.floor(Date.now() / 1000) +
        lifetime,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function createUserSession(
  user: User, version = 1
) {
  return createSession(
    user.id,
    SESSION_LIFETIME,
    "user",
    version
  );
}

export function createDemoSession() {
  if (!demoEnabled()) {
    throw new Error(
      "ورود آزمایشی غیرفعال است."
    );
  }

  return createSession(
    DEMO_USER_ID,
    DEMO_SESSION_LIFETIME,
    "demo"
  );
}

export async function getCurrentUser():
  Promise<User | null> {
  try {
    const token = (await cookies())
      .get(COOKIE)?.value;

    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
    const [payload, mac] = parts;

    if (!payload || !mac) {
      return null;
    }

    const expected = Buffer.from(
      sign(payload),
      "hex"
    );

    const received = Buffer.from(
      mac,
      "hex"
    );

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
    );

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now() / 1000
    ) {
      return null;
    }

    // Stateless preview account:
    // no JSON file access or write required.
    if (
      parsed.kind === "demo" &&
      parsed.id === DEMO_USER_ID &&
      demoEnabled()
    ) {
      return {
        id: DEMO_USER_ID,
        email: "preview@parabin.test",
        name: "بازدیدکننده نسخه نمایشی",
        createdAt: "2026-01-01T00:00:00.000Z",
      };
    }

    if (
      parsed.kind !== "user" &&
      parsed.kind !== undefined
    ) {
      return null;
    }

    const { data, error } = await getSupabaseAdmin().from("site_users")
      .select("id,email,name,created_at,session_version").eq("id", parsed.id).maybeSingle();
    if (error || !data || (data as {session_version?:number}).session_version !== (parsed.version ?? 1)) return null;
    return asUser(data as UserRow);
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await getSupabaseAdmin().from("site_users")
    .select("id,email,name,created_at").order("created_at", { ascending: false });
  if (error) dbFail(error);
  return ((data ?? []) as UserRow[]).map((row: UserRow) => asUser(row));
}

export async function updateUserName(userId: string, name: string): Promise<User> {
  if (userId === DEMO_USER_ID) {
    throw new Error("ویرایش اطلاعات حساب نمایشی مجاز نیست.");
  }
  const cleaned = name.trim();
  if (cleaned.length < 2 || cleaned.length > 80) {
    throw new Error("نام باید بین ۲ تا ۸۰ کاراکتر باشد.");
  }
  const { data, error } = await getSupabaseAdmin().from("site_users")
    .update({ name: cleaned }).eq("id", userId)
    .select("id,email,name,created_at").maybeSingle();
  if (error) dbFail(error);
  if (!data) throw new Error("کاربر پیدا نشد.");
  return asUser(data as UserRow);
}

export const userCookie = {
  name: COOKIE,
  options: {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_LIFETIME,
  },
};

export const demoCookieOptions = {
  ...userCookie.options,
  maxAge: DEMO_SESSION_LIFETIME,
};
