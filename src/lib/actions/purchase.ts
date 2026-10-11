"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { vndToPoints } from "@/lib/points";
import { generateLicenseKey } from "@/lib/software/license";
import { isParishAdmin } from "@/lib/giaoly-context";
import { syncFeatureProvision } from "@/lib/giaoly-provision";
import { isOwned } from "@/data/store-user";

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
  if (!user)
    redirect(kind === "topping" ? "/login?next=/buy/topping" : `/login?next=/buy/${productId}?kind=${kind}`);

  const supabase = createStoreAdminClient();
  if (kind === "software") return purchaseSoftware(user.id, productId);
  const settings = await getSettings();

  let priceMonth = 0;
  let proFree = false;
  if (kind !== "topping") {
    const { data: product } = await supabase
      .from("products")
      .select("id,slug,type,price_month,giaoly_pro_free,giaoly_feature_key,published")
      .eq("id", productId)
      .maybeSingle();
    // Phần mềm chỉ mua qua kind=software (tạo key) — chặn lách nhánh Pro-free.
    if (!product || !product.published || product.type === "software")
      throw new Error("Sản phẩm không tồn tại.");
    // Tính năng Giáo Lý Số áp cho cả giáo xứ → chỉ quản trị giáo xứ đã liên kết mới mua được.
    if (product.giaoly_feature_key && !(await isParishAdmin())) redirect(`/product/${product.slug}`);
    priceMonth = product.price_month ?? 0;
    proFree = product.giaoly_pro_free;
    // Đã sở hữu vĩnh viễn → không trừ point lần nữa (form cũ / bấm Back / mở lại link mua).
    if (kind === "perpetual" && (await isOwned(user.id, productId))) redirect("/library");
  }

  // Full Topping (không gắn sản phẩm) luôn trả point.
  const isPro = proFree && (await getCurrentUserPlan()) === "pro";
  const points = isPro ? 0 : await purchasePricePoints(kind, priceMonth);
  const days =
    kind === "perpetual" ? null : kind === "freedom" ? settings.freedomDays : YEAR_DAYS; // annual | topping

  // Trừ point + cấp quyền (cộng nối hạn) + ghi lịch sử trong MỘT transaction, chống trùng theo purchase_key
  // (trang /buy sinh khóa mới mỗi lần mở → bấm 2 lần / gửi lại không trừ 2 lần).
  const key = String(formData.get("purchase_key") ?? "").trim() || crypto.randomUUID();
  const { error } = await supabase.rpc("purchase_product", {
    p_user: user.id,
    p_product: kind === "topping" ? null : productId,
    p_kind: kind,
    p_points: points,
    p_days: days,
    p_source: isPro ? "giaoly_pro" : "purchase",
    p_key: key,
  });
  if (error) {
    if (/INSUFFICIENT_POINTS/.test(error.message))
      redirect(`/wallet?need=${points}&back=${encodeURIComponent(kind === "topping" ? "/buy/topping" : `/buy/${productId}?kind=${kind}`)}`);
    throw new Error(error.message);
  }
  if (kind !== "topping") await syncFeatureSafe(user.id, productId);

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

/** Đồng bộ tính năng sang Giáo Lý Số — lỗi không làm hỏng giao dịch (job lưu lại để admin thử lại). */
async function syncFeatureSafe(userId: string, productId: string) {
  try {
    await syncFeatureProvision(userId, productId);
  } catch (e) {
    console.error("provision", e);
  }
}
