"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { normalizePlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface AddGameState {
  ok?: boolean;
  error?: string;
}

/**
 * Thêm một game vào tài khoản Giáo Lý Số của user (per-user).
 * Store gọi webhook sang Giáo Lý Số kèm play_url (game host trên store).
 * Cần: user đã liên kết Giáo Lý Số + có Pro, và cấu hình endpoint/secret.
 */
export async function addGameToGiaoly(
  _prev: AddGameState,
  formData: FormData
): Promise<AddGameState> {
  const productId = String(formData.get("product_id") ?? "").trim();
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn chưa đăng nhập." };

  const ctx = await getGiaolyContext();
  if (!ctx?.giaolyUserId) return { error: "Cần liên kết tài khoản Giáo Lý Số." };
  if (normalizePlan(ctx.planRaw) !== "pro")
    return { error: "Cần gói Pro Giáo Lý Số để thêm game." };

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,slug,title,type,icon,game_url,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published) return { error: "Sản phẩm không tồn tại." };
  if (product.type !== "game" || !product.game_url)
    return { error: "Chỉ thêm được game." };

  const endpoint = process.env.GIAOLY_PROVISION_URL;
  const secret = process.env.GIAOLY_PROVISION_SECRET;
  if (!endpoint || !secret) {
    return {
      error: "Chưa cấu hình endpoint Giáo Lý Số (GIAOLY_PROVISION_URL/SECRET).",
    };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const playUrl = product.game_url.startsWith("http")
    ? product.game_url
    : `${site}${product.game_url}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-provision-secret": secret },
      body: JSON.stringify({
        action: "add_game",
        giaoly_user_id: ctx.giaolyUserId,
        game: {
          key: product.slug,
          title: product.title,
          play_url: playUrl,
          icon: product.icon ?? "◈",
        },
      }),
    });
    if (!res.ok) return { error: `Giáo Lý Số từ chối (${res.status}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không gọi được Giáo Lý Số." };
  }

  return { ok: true };
}
