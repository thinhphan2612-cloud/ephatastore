import "server-only";
import { getCurrentUserPlan } from "@/lib/plan";
import { isOwned, hasActiveTopping } from "@/data/store-user";

/**
 * Quyền dùng sản phẩm cho user đang đăng nhập.
 * - GAME: free với tài khoản Pro Giáo Lý Số (admin hoặc GLV).
 * - Sản phẩm khác, tier free: free cho mọi người.
 * - Sản phẩm khác, tier pro: phải MUA trên store (sở hữu / Full Topping).
 */
export async function canAccessProduct(
  userId: string,
  product: { id: string; tier: string; type: string }
): Promise<boolean> {
  if (product.type === "game") {
    return (await getCurrentUserPlan()) === "pro";
  }
  if (product.tier !== "pro") return true;
  return (await isOwned(userId, product.id)) || (await hasActiveTopping(userId));
}
