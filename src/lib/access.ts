import "server-only";
import { getCurrentUserPlan } from "@/lib/plan";
import { isOwned, hasActiveTopping } from "@/data/store-user";

/**
 * Quyền dùng sản phẩm cho user đang đăng nhập (mô hình point).
 * - Sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số" + user có Pro → dùng free.
 * - Sản phẩm free (không phải tier pro và giá 0) → free cho mọi người.
 * - Còn lại → phải MUA bằng point (đã sở hữu) hoặc có Full Topping.
 * - Phần mềm bán key (software): chỉ khi đã mua — không free theo Pro / topping (key vĩnh viễn).
 */
export async function canAccessProduct(
  userId: string,
  product: { id: string; tier: string; type: string; priceMonth?: number; giaolyProFree?: boolean }
): Promise<boolean> {
  if (product.type === "software") return isOwned(userId, product.id);
  if (product.giaolyProFree && (await getCurrentUserPlan()) === "pro") return true;
  const isFree = product.tier !== "pro" && (product.priceMonth ?? 0) <= 0;
  if (isFree) return true;
  return (await isOwned(userId, product.id)) || (await hasActiveTopping(userId));
}
