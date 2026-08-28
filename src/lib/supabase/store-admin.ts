import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase STORE với service_role — BYPASS RLS.
 * CHỈ dùng server-side (server actions / server components).
 * `server-only` đảm bảo file này không bao giờ lọt vào bundle client.
 */
export function createStoreAdminClient() {
  const url = process.env.NEXT_PUBLIC_STORE_SUPABASE_URL!;
  const serviceKey = process.env.STORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Thiếu STORE_SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
