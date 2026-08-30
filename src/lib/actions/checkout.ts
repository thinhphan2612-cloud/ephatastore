"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface DiscountState {
  ok?: boolean;
  error?: string;
}

/** Áp mã giảm giá cho đơn (chỉ đơn của chính mình, còn pending). */
export async function applyDiscount(
  _prev: DiscountState,
  formData: FormData
): Promise<DiscountState> {
  const orderId = String(formData.get("order_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Nhập mã giảm giá." };

  const user = await getCurrentUser();
  if (!user) return { error: "Bạn chưa đăng nhập." };

  const supabase = createStoreAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id,store_user_id,status,subtotal_vnd")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.store_user_id !== user.id) return { error: "Không tìm thấy đơn." };
  if (order.status !== "pending") return { error: "Đơn không còn ở trạng thái chờ." };

  const { data: dc } = await supabase
    .from("discount_codes")
    .select("code,kind,value,active,expires_at,max_uses,used_count")
    .eq("code", code)
    .maybeSingle();

  if (!dc || !dc.active) return { error: "Mã không hợp lệ." };
  if (dc.expires_at && new Date(dc.expires_at) < new Date())
    return { error: "Mã đã hết hạn." };
  if (dc.max_uses != null && dc.used_count >= dc.max_uses)
    return { error: "Mã đã hết lượt dùng." };

  const subtotal = order.subtotal_vnd ?? 0;
  const rawDiscount =
    dc.kind === "percent" ? Math.floor((subtotal * dc.value) / 100) : dc.value;
  const discount = Math.min(rawDiscount, subtotal);

  const { error } = await supabase
    .from("orders")
    .update({
      discount_code: dc.code,
      discount_vnd: discount,
      total_vnd: subtotal - discount,
    })
    .eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath(`/checkout/${orderId}`);
  return { ok: true };
}

/** Gỡ mã giảm giá khỏi đơn. */
export async function removeDiscount(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = createStoreAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,store_user_id,subtotal_vnd")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.store_user_id !== user.id) return;

  await supabase
    .from("orders")
    .update({
      discount_code: null,
      discount_vnd: 0,
      total_vnd: order.subtotal_vnd ?? 0,
    })
    .eq("id", orderId);

  revalidatePath(`/checkout/${orderId}`);
}
