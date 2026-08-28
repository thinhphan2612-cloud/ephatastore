import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createGiaolyServerClient } from "@/lib/supabase/giaoly-server";

export type Plan = "free" | "pro";

/**
 * Chuẩn hoá giá trị parishes.plan về 'free' | 'pro'.
 * Hai tầng giaoly: "Khởi động" (free) và "Pro" (theo quy mô).
 * Chỉ coi là 'pro' khi khớp 'pro'; các giá trị Khởi động/khởi tạo/null → 'free'.
 */
export function normalizePlan(raw: string | null | undefined): Plan {
  if (!raw) return "free";
  const v = raw.trim().toLowerCase();
  const freeAliases = ["free", "khoi_dong", "khởi động", "khoi dong", "starter", "basic"];
  if (freeAliases.includes(v)) return "free";
  if (v.includes("pro")) return "pro";
  return "free";
}

/**
 * Gói hiệu lực của user hiện tại = gói của giáo xứ họ thuộc về.
 * Gọi RPC get_my_plan() bên giaoly (hàm SECURITY DEFINER, tự lọc theo auth.uid()).
 * Store KHÔNG chạm trực tiếp bảng profiles/parishes → tách khỏi schema giaoly.
 * Lỗi/chưa có RPC → 'free'.
 */
export const getCurrentUserPlan = cache(async (): Promise<Plan> => {
  const user = await getCurrentUser();
  if (!user) return "free";

  try {
    const supabase = await createGiaolyServerClient();
    const { data, error } = await supabase.rpc("get_my_plan");
    if (error) return "free";
    return normalizePlan(data as string | null);
  } catch {
    return "free";
  }
});
