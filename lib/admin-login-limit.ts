import "server-only";
import { withDatabaseTransaction } from "@/lib/supabase-admin";

// Shared across workers. A global limit avoids trusting spoofable proxy IP headers.
// Edge/WAF per-client limits should additionally be configured by the operator.
export async function reserveAdminLoginAttempt(): Promise<boolean> {
  return withDatabaseTransaction(async client => {
    const result = await client.query(`
      INSERT INTO public.admin_login_limits (key, window_start, attempts)
      VALUES ('admin', clock_timestamp(), 1)
      ON CONFLICT (key) DO UPDATE SET
        window_start = CASE WHEN admin_login_limits.window_start <= clock_timestamp() - interval '1 minute'
          THEN clock_timestamp() ELSE admin_login_limits.window_start END,
        attempts = CASE WHEN admin_login_limits.window_start <= clock_timestamp() - interval '1 minute'
          THEN 1 ELSE admin_login_limits.attempts + 1 END
      WHERE admin_login_limits.window_start <= clock_timestamp() - interval '1 minute'
         OR admin_login_limits.attempts < 30
      RETURNING attempts
    `);
    return (result.rowCount ?? 0) > 0;
  });
}
