"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { vndToPoints } from "@/lib/points";
import { adjustPoints, InsufficientPointsError } from "@/lib/ai/wallet-ops";

const YEAR_DAYS = 365;

export type PurchaseKind = "annual" | "freedom" | "topping" | "perpetual";

/** Số point cần trả cho một lượt mua (0 nếu free). */
export async function purchasePricePoints(
  kind: PurchaseKind,
  priceMonth: number
): Promise<number> {
  if (kind === "topping") {
    const { fullToppingPrice } = await getSettings();
    return vndToPoints(fullToppingPrice * 12);
  }
  if (kind === "annual") return vndToPoints(priceMonth * 12);
  // freedom | perpetual → giá 1 tháng
  return vndToPoints(priceMonth);
}

/**
 * Mua bằng point + cấp quyền ngay. Pro Giáo Lý Số → kích hoạt miễn phí.
 * kind: annual (365 ngày) | freedom (N ngày) | perpetual (vĩnh viễn: game, file tải về) | topping (all-access 365 ngày).
 */
export async function confirmPurchase(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as PurchaseKind;
  if (!user) redirect(`/login?next=/buy/${productId}?kind=${kind}`);

  const supabase = createStoreAdminClient();
  const settings = await getSettings();

  let priceMonth = 0;
  if (kind !== "topping") {
    const { data: product } = await supabase
      .from("products")
      .select("id,price_month,published")
      .eq("id", productId)
      .maybeSingle();
    if (!product || !product.published) throw new Error("Sản phẩm không tồn tại.");
    priceMonth = product.price_month ?? 0;
  }

  const plan = await getCurrentUserPlan();
  const isPro = plan === "pro";

  const points = isPro ? 0 : await purchasePricePoints(kind, priceMonth);

  // Trừ point (bỏ qua nếu 0 = free / Pro).
  if (points > 0) {
    try {
      await adjustPoints(user.id, -points, "spend", productId, "Mua sản phẩm");
    } catch (e) {
      if (e instanceof InsufficientPointsError)
        redirect(`/wallet?need=${points}`);
      throw e;
    }
  }

  // Cấp quyền.
  if (kind === "topping") {
    const { error } = await supabase.from("subscriptions").insert({
      store_user_id: user.id,
      kind: "topping",
      expires_at: new Date(Date.now() + YEAR_DAYS * 86400000).toISOString(),
    });
    if (error) throw new Error(error.message);
  } else {
    const expires =
      kind === "perpetual"
        ? null
        : new Date(
            Date.now() +
              (kind === "annual" ? YEAR_DAYS : settings.freedomDays) * 86400000
          ).toISOString();
    const { error } = await supabase.from("entitlements").upsert(
      {
        store_user_id: user.id,
        product_id: productId,
        source: isPro ? "giaoly_pro" : "purchase",
        expires_at: expires,
      },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: false }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/library");
  redirect("/library");
}
