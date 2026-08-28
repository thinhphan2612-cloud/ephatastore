import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase STORE phía browser (đăng ký / đăng nhập tài khoản store). */
export function createStoreAuthBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_STORE_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_STORE_SUPABASE_ANON_KEY!
  );
}
