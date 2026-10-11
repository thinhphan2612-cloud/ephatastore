import "server-only";
import { getCurrentUserPlan, effectivePlan, type Plan } from "@/lib/plan";
import { getGiaolyContextFor } from "@/lib/giaoly-context";
import { isOwned, hasActiveTopping } from "@/data/store-user";

type AccessProduct = { id: string; tier: string; type: string; priceMonth?: number; giaolyProFree?: boolean };

/**
 * Quyền dùng sản phẩm cho user đang đăng nhập (mô hình point).
 * - Sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số" + user có Pro → dùng free.
 * - Sản phẩm free (không phải tier pro và giá 0) → free cho mọi người.
 * - Còn lại → phải MUA bằng point (đã sở hữu) hoặc có Full Topping.
 * - Phần mềm bán key (software): chỉ khi đã mua — không free theo Pro / topping (key vĩnh viễn).
 */
export async function canAccessProduct(userId: string, product: AccessProduct): Promise<boolean> {
  return accessWith(userId, product, getCurrentUserPlan);
}

/** Như canAccessProduct nhưng không cần phiên (vd link nhúng /e mở trong Giáo Lý Số): gói Pro đọc theo userId. */
export async function canUserAccessProduct(userId: string, product: AccessProduct): Promise<boolean> {
  return accessWith(userId, product, async () => effectivePlan(await getGiaolyContextFor(userId)));
}

async function accessWith(userId: string, product: AccessProduct, plan: () => Promise<Plan>): Promise<boolean> {
  if (product.type === "software") return isOwned(userId, product.id);
  if (product.giaolyProFree && (await plan()) === "pro") return true;
  const isFree = product.tier !== "pro" && (product.priceMonth ?? 0) <= 0;
  if (isFree) return true;
  return (await isOwned(userId, product.id)) || (await hasActiveTopping(userId));
}
