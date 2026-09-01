import "server-only";
import { getCurrentUserPlan } from "@/lib/plan";
import { isOwned, hasActiveTopping } from "@/data/store-user";

/**
 * Quyền dùng sản phẩm cho user đang đăng nhập (mô hình point).
 * - Có Pro Giáo Lý Số → dùng free mọi thứ (kích hoạt miễn phí).
 * - Sản phẩm free (không phải tier pro và giá 0) → free cho mọi người.
 * - Còn lại → phải MUA bằng point (đã sở hữu) hoặc có Full Topping.
 */
export async function canAccessProduct(
  userId: string,
  product: { id: string; tier: string; type: string; priceMonth?: number }
): Promise<boolean> {
  if ((await getCurrentUserPlan()) === "pro") return true;
  const isFree = product.tier !== "pro" && (product.priceMonth ?? 0) <= 0;
  if (isFree) return true;
  return (await isOwned(userId, product.id)) || (await hasActiveTopping(userId));
}
