import { cache } from "react";
import { getGiaolyContext, type GiaolyContext } from "@/lib/giaoly-context";

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
 * Gói ĐANG hiệu lực: Pro chỉ khi gói là pro VÀ chưa quá hạn (Giáo Lý Số giữ plan='pro' cả sau khi hết hạn,
 * hạn thật nằm ở plan_expires_at — cùng cách app Giáo Lý Số tự tính).
 */
export function effectivePlan(ctx: GiaolyContext | null | undefined): Plan {
  if (!ctx || normalizePlan(ctx.planRaw) !== "pro") return "free";
  if (ctx.planExpiresAt && new Date(ctx.planExpiresAt).getTime() <= Date.now()) return "free";
  return "pro";
}

/** Gói hiệu lực của user hiện tại = gói của giáo xứ họ thuộc về (ngữ cảnh tự làm mới mỗi 6 giờ). */
export const getCurrentUserPlan = cache(async (): Promise<Plan> => effectivePlan(await getGiaolyContext()));
