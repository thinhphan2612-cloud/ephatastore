"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { vndToPoints } from "@/lib/points";
import { adjustPoints, InsufficientPointsError } from "@/lib/wallet-ops";
import { generateLicenseKey } from "@/lib/software/license";

const YEAR_DAYS = 365;

export type PurchaseKind = "annual" | "freedom" | "topping" | "perpetual" | "software";

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
  // freedom | perpetual | software → giá 1 tháng
  return vndToPoints(priceMonth);
}

/**
 * Mua bằng point + cấp quyền ngay. Sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số" + user có Pro → miễn phí.
 * kind: annual (365 ngày) | freedom (N ngày) | perpetual (vĩnh viễn: game, file tải về) | topping (all-access 365 ngày)
 *       | software (key vĩnh viễn — luôn trả point, kể cả Pro).
 */
export async function confirmPurchase(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as PurchaseKind;
  if (!user) redirect(`/login?next=/buy/${productId}?kind=${kind}`);

  const supabase = createStoreAdminClient();
  if (kind === "software") return purchaseSoftware(user.id, productId);
  const settings = await getSettings();

  let priceMonth = 0;
  let proFree = false;
  if (kind !== "topping") {
    const { data: product } = await supabase
      .from("products")
      .select("id,type,price_month,giaoly_pro_free,published")
      .eq("id", productId)
      .maybeSingle();
    // Phần mềm chỉ mua qua kind=software (tạo key) — chặn lách nhánh Pro-free.
    if (!product || !product.published || product.type === "software")
      throw new Error("Sản phẩm không tồn tại.");
    priceMonth = product.price_month ?? 0;
    proFree = product.giaoly_pro_free;
  }

  // Full Topping (không gắn sản phẩm) luôn trả point.
  const isPro = proFree && (await getCurrentUserPlan()) === "pro";

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

/**
 * Mua key phần mềm: RPC purchase_software trừ point + tạo key + cấp quyền trong 1 transaction
 * (đã có key → không trừ). Trùng key (23505) → toàn bộ rollback, thử lại với key mới.
 */
async function purchaseSoftware(userId: string, productId: string): Promise<never> {
  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,slug,type,price_month,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published || product.type !== "software")
    throw new Error("Sản phẩm không tồn tại.");

  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.rpc("purchase_software", {
      p_user: userId,
      p_product: productId,
      p_key: generateLicenseKey(product.slug),
    });
    if (!error) break;
    if (/INSUFFICIENT_POINTS/.test(error.message))
      redirect(`/wallet?need=${vndToPoints(product.price_month ?? 0)}`);
    if (error.code === "23505" && attempt < 5) continue;
    throw new Error(error.message);
  }

  revalidatePath("/library");
  redirect("/library");
}
