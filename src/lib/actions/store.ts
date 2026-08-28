"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/**
 * Nhận (free) hoặc bắt đầu mua (paid) một sản phẩm.
 * Danh tính lấy từ session giaoly đã xác thực — không tin productId về giá.
 */
export async function claimProduct(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/product/${slug}` : "/")}`);
  }

  const supabase = createStoreAdminClient();

  // Lấy giá từ DB (không tin client).
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id,price_vnd,published")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!product || !product.published) throw new Error("Sản phẩm không tồn tại.");

  // Miễn phí → cấp sở hữu ngay (idempotent).
  if (product.price_vnd <= 0) {
    const { error } = await supabase
      .from("entitlements")
      .upsert(
        { giaoly_user_id: user.id, product_id: product.id },
        { onConflict: "giaoly_user_id,product_id", ignoreDuplicates: true }
      );
    if (error) throw new Error(error.message);
    revalidatePath("/library");
    redirect("/library");
  }

  // Có phí → tạo đơn pending + item, chuyển sang trang thanh toán.
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({ giaoly_user_id: user.id, status: "pending", total_vnd: product.price_vnd })
    .select("id")
    .single();
  if (oErr) throw new Error(oErr.message);

  const { error: iErr } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    unit_price_vnd: product.price_vnd,
  });
  if (iErr) throw new Error(iErr.message);

  redirect(`/checkout/${order.id}`);
}
