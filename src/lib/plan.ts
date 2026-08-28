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
 * Đọc qua session giaoly (RLS tự chủ). Lỗi/không có → 'free'.
 */
export const getCurrentUserPlan = cache(async (): Promise<Plan> => {
  const user = await getCurrentUser();
  if (!user) return "free";

  try {
    const supabase = await createGiaolyServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("parish_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.parish_id) return "free";

    const { data: parish } = await supabase
      .from("parishes")
      .select("plan")
      .eq("id", profile.parish_id)
      .maybeSingle();

    return normalizePlan(parish?.plan);
  } catch {
    return "free";
  }
});
