import "server-only";
import { getCurrentUserPlan } from "@/lib/plan";
import { getSettings } from "@/data/settings";
import { isOwned, hasActiveTopping } from "@/data/store-user";

/**
 * Quyền dùng sản phẩm cho user đang đăng nhập.
 * - giaoly_pro (giai đoạn đầu): cần gói Pro giaoly (mọi sản phẩm).
 * - store: sở hữu (entitlement/topping) hoặc sản phẩm free.
 */
export async function canAccessProduct(
  userId: string,
  product: { id: string; tier: string }
): Promise<boolean> {
  const { accessMode } = await getSettings();
  if (accessMode === "giaoly_pro") {
    return (await getCurrentUserPlan()) === "pro";
  }
  if (product.tier !== "pro") return true;
  return (await isOwned(userId, product.id)) || (await hasActiveTopping(userId));
}
