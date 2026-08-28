import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase STORE phía server, có session qua cookie.
 * Đây là danh tính GỐC của store (tài khoản store). Dùng anon/publishable key.
 */
export async function createStoreAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_STORE_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_STORE_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // gọi từ Server Component — bỏ qua; proxy sẽ refresh cookie.
        }
      },
    },
  });
}
