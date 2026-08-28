import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase GIAOLY phía browser (dùng cho form đăng nhập). */
export function createGiaolyBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_ANON_KEY!
  );
}
