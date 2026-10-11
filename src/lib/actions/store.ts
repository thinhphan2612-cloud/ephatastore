"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getGiaolyContext, isParishAdmin } from "@/lib/giaoly-context";
import { syncFeatureProvision, syncParishFeature } from "@/lib/giaoly-provision";
import type { NoticeCode } from "@/lib/notices";

/** Lỗi người dùng gặp được (không phải lỗi hệ thống) → quay lại trang sản phẩm kèm thông báo, thay vì trang lỗi chung. */
function backWithNotice(slug: string, code: NoticeCode): never {
  redirect(slug ? `/product/${slug}?notice=${code}` : "/");
}

/**
 * Nhận sản phẩm FREE → cấp quyền vĩnh viễn ngay.
 * Sản phẩm có phí đi qua trang /buy (mua bằng point).
 */
export async function claimProduct(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/product/${slug}` : "/")}`);
  }

  const supabase = createStoreAdminClient();
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id,tier,price_month,giaoly_feature_key,published,active")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) backWithNotice(slug, "product_unavailable");
  if (!product || !product.published || !product.active) backWithNotice(slug, "product_unavailable");
  if (product.tier === "pro" && product.price_month > 0) backWithNotice(slug, "needs_purchase");
  if (product.giaoly_feature_key && !(await isParishAdmin()))
    backWithNotice(slug, "feature_parish_admin");

  // Tính năng Giáo Lý Số miễn phí → bật cho cả giáo xứ.
  if (product.giaoly_feature_key) {
    const parishId = (await getGiaolyContext())?.parishId;
    if (!parishId) backWithNotice(slug, "feature_parish_admin");
    const { error: pe } = await supabase
      .from("parish_entitlements")
      .upsert(
        { parish_id: parishId, product_id: product.id, source: "free", expires_at: null, purchased_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "parish_id,product_id" }
      );
    if (pe) throw new Error(pe.message);
    await syncParishSafe(parishId, product.id, user.id);
    revalidatePath("/library");
    redirect("/library");
  }

  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: user.id, product_id: product.id, source: "free", expires_at: null },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
  await syncFeatureSafe(user.id, product.id);
  revalidatePath("/library");
  redirect("/library");
}

/** Bắt đầu dùng thử (Trial) miễn phí, có hạn — 1 lần / sản phẩm / user. */
export async function startTrial(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/product/${slug}` : "/")}`);
  }

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,tier,trial,trial_days,giaoly_feature_key,published,active")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published || !product.active) backWithNotice(slug, "product_unavailable");
  if (product.tier !== "pro" || !product.trial) backWithNotice(slug, "no_trial");
  if (product.giaoly_feature_key && !(await isParishAdmin()))
    backWithNotice(slug, "feature_parish_admin");

  const expires = new Date(Date.now() + (product.trial_days || 7) * 86400000).toISOString();

  // Tính năng Giáo Lý Số: dùng thử 1 lần / GIÁO XỨ (gỡ rồi liên kết lại, hay đổi quản trị khác, cũng không thử lại được).
  if (product.giaoly_feature_key) {
    const parishId = (await getGiaolyContext())?.parishId;
    if (!parishId) backWithNotice(slug, "feature_parish_admin");
    const { error: pe } = await supabase
      .from("parish_entitlements")
      .insert({ parish_id: parishId, product_id: product.id, source: "trial", expires_at: expires, purchased_by: user.id });
    if (pe) backWithNotice(slug, pe.code === "23505" ? "trial_used_parish" : "product_unavailable"); // đã có dòng = từng thử / mua
    await syncParishSafe(parishId, product.id, user.id);
    revalidatePath("/library");
    redirect("/library");
  }

  // Chỉ cho dùng thử 1 lần: đã từng có quyền với sản phẩm (thử / mua, kể cả hết hạn) → không thử nữa.
  // (Trước đây chỉ xét source = trial: mua gói năm xong hết hạn vẫn dùng thử lại được, và upsert ghi đè quyền đã mua.)
  const { count } = await supabase
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("store_user_id", user.id)
    .eq("product_id", product.id);
  if ((count ?? 0) > 0) backWithNotice(slug, "trial_used");

  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: user.id, product_id: product.id, source: "trial", expires_at: expires },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: false }
    );
  if (error) throw new Error(error.message);
  await syncFeatureSafe(user.id, product.id);

  revalidatePath("/library");
  redirect("/library");
}

async function syncParishSafe(parishId: string, productId: string, userId: string) {
  try {
    await syncParishFeature(parishId, productId, userId);
  } catch (e) {
    console.error("provision", e);
  }
}

/** Đồng bộ tính năng sang Giáo Lý Số — lỗi không làm hỏng giao dịch (job lưu lại để admin thử lại). */
async function syncFeatureSafe(userId: string, productId: string) {
  try {
    await syncFeatureProvision(userId, productId);
  } catch (e) {
    console.error("provision", e);
  }
}
