import { NextResponse, type NextRequest } from "next/server";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { hostedPlayUrl, PLAY_TOKEN_TTL_MS, verifyEmbedToken } from "@/lib/hosted-access";
import { canUserAccessProduct } from "@/lib/access";

/**
 * Link nhúng ỔN ĐỊNH cho Giáo Lý Số: /e/<productId>/<mã nhúng> → chuyển tới bản build ĐANG CHẠY của sản phẩm
 * (domain play, kèm mã chơi 12 giờ mới). Thay / quay lại bản build không làm gãy link đã gửi sang Giáo Lý Số.
 * Không cần cookie (mở trong app Giáo Lý Số) — mã nhúng gắn sản phẩm + người, ký HMAC (lib/hosted-access).
 * Mỗi lần mở kiểm lại QUYỀN hiện tại của người đó: hết Pro / Full Topping / gói, hoặc bị thu hồi → không cấp mã chơi mới.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string; token: string }> }) {
  const { productId, token } = await params;
  const userId = verifyEmbedToken(token, productId);
  if (!userId) {
    return new NextResponse("Liên kết đã hết hạn hoặc không hợp lệ. Thêm lại game từ Ephata Store.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const { data: product } = await createStoreAdminClient()
    .from("products")
    .select("id,tier,type,price_month,giaoly_pro_free,game_url")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return new NextResponse("Not found", { status: 404 });
  const allowed = await canUserAccessProduct(userId, {
    id: product.id,
    tier: product.tier,
    type: product.type,
    priceMonth: product.price_month ?? 0,
    giaolyProFree: product.giaoly_pro_free,
  });
  if (!allowed) {
    return new NextResponse(
      "Bạn không còn quyền dùng sản phẩm này (hết hạn gói, Full Topping hoặc Pro Giáo Lý Số). Mở Ephata Store để gia hạn.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }
    );
  }
  const playUrl = product?.game_url ? hostedPlayUrl(product.game_url, userId, PLAY_TOKEN_TTL_MS) : null;
  if (!playUrl) return new NextResponse("Not found", { status: 404 });

  const res = NextResponse.redirect(new URL(playUrl, req.url), 302);
  res.headers.set("cache-control", "no-store");
  return res;
}
