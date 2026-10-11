import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createStoreAuthServerClient } from "@/lib/supabase/store-auth-server";

/** User đăng nhập hiện tại (tài khoản STORE), hoặc null. Cache theo request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createStoreAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Admin xét theo ID tài khoản (env ADMIN_USER_IDS, phân cách bằng dấu phẩy) — KHÔNG theo email:
 * đăng ký không xác minh email nên ai cũng có thể tạo tài khoản mang email admin; ID chỉ có sau khi tài khoản
 * đã tồn tại và do chủ store tự thêm. Thiếu env → không ai là admin (đóng mặc định).
 */
function adminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: Pick<User, "id"> | null | undefined): boolean {
  return !!user && adminIds().includes(user.id.toLowerCase());
}

/** User hiện tại nếu là admin, ngược lại null. */
export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  return isAdminUser(user) ? user : null;
}
