import { createClient } from "@supabase/supabase-js";

/**
 * Client đọc dữ liệu thương mại từ Supabase STORE (dùng publishable/anon key).
 * Chỉ dùng cho dữ liệu công khai (catalog) — RLS bảo vệ orders/entitlements.
 * Tạo mới mỗi lần gọi để an toàn ở môi trường server component.
 */
export function createStoreClient() {
  const url = process.env.NEXT_PUBLIC_STORE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_STORE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_STORE_SUPABASE_URL / NEXT_PUBLIC_STORE_SUPABASE_ANON_KEY trong .env.local"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
