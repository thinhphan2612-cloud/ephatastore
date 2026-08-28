import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createGiaolyServerClient } from "@/lib/supabase/giaoly-server";

/**
 * Ngữ cảnh user từ giaoly, đọc qua 1 RPC get_my_context().
 * Gồm giáo xứ, vai trò, và gói (raw). Dùng cho: gate Pro, mua tính năng (per-giáo xứ, chỉ admin).
 * Lỗi/chưa đăng nhập/chưa có RPC → null.
 */
export interface GiaolyContext {
  parishId: string | null;
  role: string | null;
  planRaw: string | null;
}

export const getGiaolyContext = cache(async (): Promise<GiaolyContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabase = await createGiaolyServerClient();
    const { data, error } = await supabase.rpc("get_my_context");
    if (error || !data) return null;
    const d = data as { parish_id?: string; role?: string; plan?: string };
    return {
      parishId: d.parish_id ?? null,
      role: d.role ?? null,
      planRaw: d.plan ?? null,
    };
  } catch {
    return null;
  }
});

/** true nếu user là admin của giáo xứ họ (được phép mua tính năng của giáo xứ). */
export async function isParishAdmin(): Promise<boolean> {
  const ctx = await getGiaolyContext();
  return ctx?.role === "admin" && !!ctx.parishId;
}
