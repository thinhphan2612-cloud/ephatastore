import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createGiaolyServerClient } from "@/lib/supabase/giaoly-server";

export type Plan = "free" | "pro";

/**
 * Chuẩn hoá giá trị parishes.plan (vd 'khoi_dong'/'pro') về 'free' | 'pro'.
 * Chỉ coi là 'pro' khi khớp rõ ràng; còn lại (Khởi động, null…) là 'free'.
 */
export function normalizePlan(raw: string | null | undefined): Plan {
  return raw && /pro/i.test(raw) ? "pro" : "free";
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
