import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/**
 * Ngữ cảnh giaoly của user store (từ liên kết đã lưu trong profiles).
 * Giá trị được cache tại thời điểm liên kết (Phase 2). null nếu chưa liên kết.
 * Lưu ý: plan có thể lệch nếu giáo xứ đổi gói sau khi liên kết — user liên kết lại để đồng bộ.
 */
export interface GiaolyContext {
  giaolyUserId: string;
  parishId: string | null;
  role: string | null;
  planRaw: string | null;
}

export const getGiaolyContext = cache(async (): Promise<GiaolyContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const admin = createStoreAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("giaoly_user_id,parish_id,role,plan")
      .eq("id", user.id)
      .maybeSingle();

    if (!data?.giaoly_user_id) return null;
    return {
      giaolyUserId: data.giaoly_user_id,
      parishId: data.parish_id ?? null,
      role: data.role ?? null,
      planRaw: data.plan ?? null,
    };
  } catch {
    return null;
  }
});

/** true nếu user đã liên kết giaoly và là admin giáo xứ (được mua tính năng). */
export async function isParishAdmin(): Promise<boolean> {
  const ctx = await getGiaolyContext();
  return ctx?.role === "admin" && !!ctx.parishId;
}
