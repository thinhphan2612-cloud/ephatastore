import { cache } from "react";
import { getGiaolyContext } from "@/lib/giaoly-context";

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
 * Đọc từ ngữ cảnh giaoly (RPC get_my_context). Không chạm schema bảng.
 */
export const getCurrentUserPlan = cache(async (): Promise<Plan> => {
  const ctx = await getGiaolyContext();
  return normalizePlan(ctx?.planRaw);
});
