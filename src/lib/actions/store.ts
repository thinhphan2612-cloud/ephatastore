"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";

const YEAR_DAYS = 365;

/**
 * Nhận (free) / bắt đầu mua gói năm (pro).
 * FREE → cấp quyền vĩnh viễn ngay. PRO → tạo đơn gói năm (giá tháng × 12) → checkout.
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

  // FREE → cấp quyền vĩnh viễn.
  if (product.tier !== "pro" || product.price_month <= 0) {
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

  // PRO → đơn gói năm (giá tháng × 12), cấp 365 ngày khi duyệt.
  const annual = product.price_month * 12;
  const orderCode = "DH" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      store_user_id: user.id,
      status: "pending",
      kind: "purchase",
      access_days: YEAR_DAYS,
      subtotal_vnd: annual,
      discount_vnd: 0,
      total_vnd: annual,
      order_code: orderCode,
    })
    .select("id")
    .single();
  if (oErr) throw new Error(oErr.message);

  const { error: iErr } = await supabase
    .from("order_items")
    .insert({ order_id: order.id, product_id: product.id, unit_price_vnd: annual });
  if (iErr) throw new Error(iErr.message);

  redirect(`/checkout/${order.id}`);
}

/** Mua Full Topping (all-access) — gói năm, mở khoá mọi sản phẩm PRO. */
export async function buyTopping() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/topping`);

  const { fullToppingPrice } = await getSettings();
  const annual = fullToppingPrice * 12;
  const supabase = createStoreAdminClient();
  const orderCode = "TP" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      store_user_id: user.id,
      status: "pending",
      kind: "topping",
      access_days: YEAR_DAYS,
      subtotal_vnd: annual,
      discount_vnd: 0,
      total_vnd: annual,
      order_code: orderCode,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/checkout/${order.id}`);
}

/** Mua lẻ Freedom: dùng N ngày (theo cấu hình) với giá 1 tháng. */
export async function claimFreedom(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/product/${slug}` : "/")}`);
  }

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,tier,price_month,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published) throw new Error("Sản phẩm không tồn tại.");
  if (product.tier !== "pro" || product.price_month <= 0)
    throw new Error("Sản phẩm này không cần mua lẻ.");

  const { freedomDays } = await getSettings();
  const orderCode = "DH" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      store_user_id: user.id,
      status: "pending",
      kind: "freedom",
      access_days: freedomDays,
      subtotal_vnd: product.price_month,
      discount_vnd: 0,
      total_vnd: product.price_month,
      order_code: orderCode,
    })
    .select("id")
    .single();
  if (oErr) throw new Error(oErr.message);

  const { error: iErr } = await supabase
    .from("order_items")
    .insert({ order_id: order.id, product_id: product.id, unit_price_vnd: product.price_month });
  if (iErr) throw new Error(iErr.message);

  redirect(`/checkout/${order.id}`);
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
