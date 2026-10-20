"use server";

import { getCurrentUser } from "@/lib/auth";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { effectivePlan } from "@/lib/plan";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { canAccessProduct } from "@/lib/access";
import { createEmbedToken } from "@/lib/hosted-access";

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
  if (effectivePlan(ctx) !== "pro")
    return { error: "Cần gói Pro Giáo Lý Số để thêm game." };

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,slug,title,type,tier,price_month,giaoly_pro_free,icon,logo_url,game_url,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published) return { error: "Sản phẩm không tồn tại." };
  if (product.type !== "game" || !product.game_url)
    return { error: "Chỉ thêm được game." };
  const allowed = await canAccessProduct(user.id, {
    id: product.id,
    tier: product.tier,
    type: product.type,
    priceMonth: product.price_month ?? 0,
    giaolyProFree: product.giaoly_pro_free,
  });
  if (!allowed) return { error: "Bạn cần sở hữu game này trước khi thêm vào Giáo Lý Số." };

  const endpoint = process.env.GIAOLY_PROVISION_URL;
  const secret = process.env.GIAOLY_PROVISION_SECRET;
  if (!endpoint || !secret) {
    return {
      error: "Chưa cấu hình endpoint Giáo Lý Số (GIAOLY_PROVISION_URL/SECRET).",
    };
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  // Game host trên store: link ổn định /e/<sản phẩm>/<mã nhúng dài hạn> — route /e chuyển tới bản build đang chạy,
  // nên thay / quay lại bản build không làm gãy game đã thêm vào Giáo Lý Số.
  const playUrl = product.game_url.startsWith("http")
    ? product.game_url
    : `${site}/e/${product.id}/${createEmbedToken(product.id, user.id)}`;

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
          // Logo vuông của sản phẩm — trang Games của GLS hiện ảnh khi có thumb_url, không có thì dùng icon.
          thumb_url: product.logo_url ?? null,
        },
      }),
    });
    if (!res.ok) return { error: `Giáo Lý Số từ chối (${res.status}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không gọi được Giáo Lý Số." };
  }

  // Ghi nhận đã thêm vào Giáo Lý Số (khóa slug: Giáo Lý Số dùng slug làm khóa game).
  await supabase
    .from("giaoly_game_links")
    .upsert({ product_id: product.id, store_user_id: user.id }, { onConflict: "product_id,store_user_id", ignoreDuplicates: true });

  return { ok: true };
}
