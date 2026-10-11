"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { vndToPoints } from "@/lib/points";
import { generateLicenseKey } from "@/lib/software/license";
import { getGiaolyContext, isParishAdmin } from "@/lib/giaoly-context";
import { syncFeatureProvision } from "@/lib/giaoly-provision";
import { isOwned } from "@/data/store-user";
import { kindsFor, type PurchaseKind } from "@/lib/purchase-kinds";
import { couponErrorOf, quoteCoupon } from "@/lib/coupons";

const YEAR_DAYS = 365;


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
 *       | software (key vĩnh viễn — luôn trả point, kể cả Pro). kind phải hợp loại sản phẩm (lib/purchase-kinds).
 * coupon: mã giảm giá (tùy chọn) — áp trong transaction (redeem_coupon, 0022).
 */
export async function confirmPurchase(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as PurchaseKind;
  const coupon = String(formData.get("coupon") ?? "").trim().toUpperCase().slice(0, 40);
  const buyPath = kind === "topping" ? "/buy/topping" : `/buy/${productId}?kind=${kind}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(buyPath)}`);
  const backToBuy = (): never =>
    redirect(`${buyPath}${coupon ? `${buyPath.includes("?") ? "&" : "?"}coupon=${encodeURIComponent(coupon)}` : ""}`);

  const supabase = createStoreAdminClient();
  if (kind === "software") return purchaseSoftware(user.id, productId, coupon, backToBuy);
  const settings = await getSettings();

  let priceMonth = 0;
  let proFree = false;
  let parishId: string | null = null; // tính năng Giáo Lý Số → quyền ghi cho giáo xứ
  if (kind !== "topping") {
    const { data: product } = await supabase
      .from("products")
      .select("id,slug,type,price_month,giaoly_pro_free,giaoly_feature_key,published,active")
      .eq("id", productId)
      .maybeSingle();
    if (!product || !product.published || !product.active) redirect("/library");
    // Gói mua phải hợp loại sản phẩm (phần mềm chỉ qua kind=software).
    if (!kindsFor(product.type).includes(kind)) redirect(`/product/${product.slug}?notice=kind_invalid`);
    // Tính năng Giáo Lý Số áp cho cả giáo xứ → chỉ quản trị giáo xứ đã liên kết mới mua được.
    if (product.giaoly_feature_key) {
      if (!(await isParishAdmin())) redirect(`/product/${product.slug}?notice=feature_parish_admin`);
      parishId = (await getGiaolyContext())?.parishId ?? null;
      if (!parishId) redirect(`/product/${product.slug}?notice=feature_parish_admin`);
    }
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
  // Pro miễn phí: quyền chỉ tới hết hạn gói Pro (gói không hạn → 365 ngày), bấm nhiều lần không cộng dồn.
  const until = isPro
    ? ((await getGiaolyContext())?.planExpiresAt ?? new Date(Date.now() + YEAR_DAYS * 86400000).toISOString())
    : null;

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
    p_coupon: !isPro && coupon ? coupon : null,
    p_until: until,
    p_parish: parishId,
  });
  if (error) {
    if (/ALREADY_OWNED/.test(error.message)) redirect("/library");
    if (couponErrorOf(error.message)) backToBuy(); // trang /buy báo lại lỗi mã
    if (/INSUFFICIENT_POINTS/.test(error.message)) {
      const q = coupon ? await quoteCoupon(user.id, coupon, points) : null;
      const need = points - (q && "discount" in q ? q.discount : 0);
      redirect(`/wallet?need=${need}&back=${encodeURIComponent(buyPath)}`);
    }
    throw new Error(error.message);
  }
  if (kind !== "topping") await syncFeatureSafe(user.id, productId);

  revalidatePath("/library");
  redirect("/library");
}

/**
 * Mua key phần mềm: RPC purchase_software trừ point (trừ mã giảm giá) + tạo key + cấp quyền trong 1 transaction
 * (đã có key → không trừ). Trùng key (23505) → toàn bộ rollback, thử lại với key mới.
 */
async function purchaseSoftware(
  userId: string,
  productId: string,
  coupon: string,
  backToBuy: () => never
): Promise<never> {
  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,slug,type,price_month,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published || product.type !== "software") redirect("/library");

  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.rpc("purchase_software", {
      p_user: userId,
      p_product: productId,
      p_key: generateLicenseKey(product.slug),
      p_coupon: coupon || null,
    });
    if (!error) break;
    if (couponErrorOf(error.message)) backToBuy();
    if (/INSUFFICIENT_POINTS/.test(error.message)) {
      const points = vndToPoints(product.price_month ?? 0);
      const q = coupon ? await quoteCoupon(userId, coupon, points) : null;
      const need = points - (q && "discount" in q ? q.discount : 0);
      redirect(`/wallet?need=${need}&back=${encodeURIComponent(`/buy/${productId}?kind=software`)}`);
    }
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
