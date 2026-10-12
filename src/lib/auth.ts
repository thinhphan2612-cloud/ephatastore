import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createStoreAuthServerClient } from "@/lib/supabase/store-auth-server";

/** Danh tính đăng nhập dùng trong app: chỉ cần id + email. */
export type AuthUser = Pick<User, "id" | "email">;

/**
 * User đăng nhập hiện tại (tài khoản STORE), hoặc null. Cache theo request.
 * getClaims(): xác minh chữ ký phiên (ES256) ngay trên máy chủ bằng khóa công khai đã cache — không gọi Supabase Auth mỗi trang
 * (trước đây getUser() tốn 1 vòng mạng / trang). Token ký kiểu cũ (HS) thì thư viện tự gọi getUser() như trước.
 * Đánh đổi: phiên bị thu hồi ở nơi khác vẫn dùng được tới khi access token hết hạn (≤ 1 giờ).
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createStoreAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub || c.role !== "authenticated") return null;
  return { id: c.sub, email: typeof c.email === "string" && c.email ? c.email : undefined };
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
export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return isAdminUser(user) ? user : null;
}
