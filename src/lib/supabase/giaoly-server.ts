import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase GIAOLY phía server (session qua cookie).
 * Dùng để đọc user đăng nhập và plan. Store xác thực dựa trên giaoly.
 */
export async function createGiaolyServerClient() {
  const url = process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_ANON_KEY!;
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
          // gọi từ Server Component — bỏ qua; middleware sẽ refresh cookie.
        }
      },
    },
  });
}
