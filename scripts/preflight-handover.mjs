import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), process.argv[2] || ".env.local");
let raw;
try { raw = readFileSync(file, "utf8"); }
catch { console.error("Missing environment file:", file); process.exit(1); }
const vars = Object.fromEntries(raw.split(/\r?\n/).filter(s => /^\s*[A-Z_]+\s*=/.test(s)).map(s => {
  const k = s.indexOf("="); return [s.slice(0,k).trim(),s.slice(k+1).trim().replace(/^(["'])(.*)\1$/, "$2")];
}));
let bad = false;
function issue(msg){console.error("ERROR",msg);bad=true;}
const required = ["DATABASE_URL","NEXT_PUBLIC_SITE_URL","ADMIN_PASSWORD","ADMIN_SESSION_SECRET","USER_AUTH_SECRET"];
for (const k of required) if (!vars[k] || /REPLACE|YOUR_|CHANGE_TO/.test(vars[k])) issue(`${k} missing / placeholder`);
try {
  const url = new URL(vars.NEXT_PUBLIC_SITE_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
} catch { issue("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL"); }
if (vars.DEV_MOCK_LOGIN === "true" || vars.DEMO_LOGIN_ENABLED === "true") issue("Demo/mock login must be disabled in production");
if (vars.ADMIN_PASSWORD?.length < 16 || vars.ADMIN_PASSWORD === "123456") issue("ADMIN_PASSWORD must be long and unique");
for (const k of ["ADMIN_SESSION_SECRET","USER_AUTH_SECRET"]) if ((vars[k] || "").length < 32) issue(`${k} must have at least 32 characters`);
if (vars.ADMIN_SESSION_SECRET && vars.ADMIN_SESSION_SECRET === vars.USER_AUTH_SECRET) issue("Session secrets must be different");
const useResend = Boolean(vars.RESEND_API_KEY && vars.MAIL_FROM);
const useGmail = Boolean(vars.GMAIL_USER && vars.GMAIL_APP_PASSWORD);
if (!useResend && !useGmail) issue("Configure Resend (RESEND_API_KEY / MAIL_FROM) or Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)");
if (useResend && /gmail\.com[>\s]*$/i.test(vars.MAIL_FROM || "")) issue("MAIL_FROM must use a verified sender domain, not a personal Gmail address");
if (useResend && !vars.RESEND_API_KEY?.startsWith("re_")) issue("Resend API key does not have its expected prefix");
if ((vars.DATABASE_URL || "").includes("localhost") || (vars.DATABASE_URL || "").includes("127.0.0.1")) {
  console.log("INFO: database host is local; PostgreSQL must run on the same VPS.");
}
console.log(bad ? "Preflight failed. Fix configuration before deployment." : "Preflight config checks passed. Network/database/email functionality still requires live tests.");
process.exitCode = bad ? 1 : 0;
