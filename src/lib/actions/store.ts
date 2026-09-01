"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

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
    .select("id,tier,price_month,published")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!product || !product.published) throw new Error("Sản phẩm không tồn tại.");
  if (product.tier === "pro" && product.price_month > 0)
    throw new Error("Sản phẩm này cần mua bằng point.");

  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: user.id, product_id: product.id, source: "free", expires_at: null },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
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
    .select("id,tier,trial,trial_days,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published) throw new Error("Sản phẩm không tồn tại.");
  if (product.tier !== "pro" || !product.trial)
    throw new Error("Sản phẩm này không có dùng thử.");

  // Chỉ cho dùng thử 1 lần (kể cả đã hết hạn).
  const { count } = await supabase
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("store_user_id", user.id)
    .eq("product_id", product.id)
    .eq("source", "trial");
  if ((count ?? 0) > 0) throw new Error("Bạn đã dùng thử sản phẩm này rồi.");

  const expires = new Date(Date.now() + (product.trial_days || 7) * 86400000).toISOString();
  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: user.id, product_id: product.id, source: "trial", expires_at: expires },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: false }
    );
  if (error) throw new Error(error.message);

  revalidatePath("/library");
  redirect("/library");
}
