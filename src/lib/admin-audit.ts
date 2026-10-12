import "server-only";
import { getAdminUser, type AuthUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Admin đang đăng nhập; không phải admin → lỗi. */
export async function requireAdmin(): Promise<AuthUser> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Không có quyền admin.");
  return admin;
}

/**
 * Ghi một dòng nhật ký thao tác admin (bảng admin_audit_log, migration 0020).
 * Best-effort: lỗi ghi nhật ký không làm hỏng thao tác chính (chỉ log ra server).
 */
export async function logAdmin(
  admin: AuthUser,
  action: string,
  target?: { type: string; id?: string | null },
  detail?: Record<string, unknown>
): Promise<void> {
  const { error } = await createStoreAdminClient()
    .from("admin_audit_log")
    .insert({
      actor_id: admin.id,
      actor_email: admin.email ?? null,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      detail: detail ?? null,
    });
  if (error) console.error("admin audit", action, error.message);
}
