import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Lỗi do hàm SQL redeem_coupon (0022) ném ra → câu cho người dùng. */
export const COUPON_ERRORS: Record<string, string> = {
  COUPON_INVALID: "Mã giảm giá không tồn tại hoặc đã tắt.",
  COUPON_EXPIRED: "Mã giảm giá đã hết hạn.",
  COUPON_USED_UP: "Mã giảm giá đã hết lượt dùng.",
  COUPON_ALREADY_USED: "Bạn đã dùng mã này rồi — mỗi tài khoản dùng một mã một lần.",
};

export function couponErrorOf(message: string): string | null {
  const code = Object.keys(COUPON_ERRORS).find((k) => message.includes(k));
  return code ? COUPON_ERRORS[code] : null;
}

export type CouponQuote = { code: string; discount: number; label: string } | { code: string; error: string };

/**
 * Báo giá trước khi mua (không trừ lượt). Cùng quy tắc với redeem_coupon — hàm SQL mới là nơi quyết định
 * khi thanh toán (mã có thể hết lượt giữa lúc xem và lúc bấm).
 */
export async function quoteCoupon(userId: string, rawCode: string, points: number): Promise<CouponQuote> {
  const code = rawCode.trim().toUpperCase().slice(0, 40);
  const supabase = createStoreAdminClient();
  const { data: c } = await supabase
    .from("discount_codes")
    .select("id,kind,value,active,expires_at,max_uses,used_count")
    .eq("code", code)
    .maybeSingle();
  if (!c || !c.active) return { code, error: COUPON_ERRORS.COUPON_INVALID };
  if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return { code, error: COUPON_ERRORS.COUPON_EXPIRED };
  if (c.max_uses != null && c.used_count >= c.max_uses) return { code, error: COUPON_ERRORS.COUPON_USED_UP };
  const { count } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", c.id)
    .eq("store_user_id", userId);
  if ((count ?? 0) > 0) return { code, error: COUPON_ERRORS.COUPON_ALREADY_USED };

  const raw = c.kind === "percent" ? Math.floor((points * Math.min(c.value, 100)) / 100) : Math.floor(c.value / 100);
  const discount = Math.max(0, Math.min(raw, points));
  const label = c.kind === "percent" ? `-${Math.min(c.value, 100)}%` : `-${c.value.toLocaleString("vi-VN")}đ`;
  return { code, discount, label };
}
