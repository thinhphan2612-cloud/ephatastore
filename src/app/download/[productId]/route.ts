import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProduct } from "@/lib/access";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

const FILES_BUCKET = "product-files";
const EXPIRES = 60 * 60 * 24; // 24h

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/download/${productId}`)}`, request.url));
  }
  // Lỗi người dùng gặp được → về trang sản phẩm kèm thông báo (không trả chữ trơn không có lối ra).
  const back = (slug: string, notice: string) => NextResponse.redirect(new URL(`/product/${slug}?notice=${notice}`, request.url));

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("slug,download_path,tier,type,price_month,giaoly_pro_free")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return NextResponse.redirect(new URL("/library", request.url));

  if (
    !(await canAccessProduct(user.id, {
      id: productId,
      tier: product.tier,
      type: product.type,
      priceMonth: product.price_month ?? 0,
      giaolyProFree: product.giaoly_pro_free,
    }))
  ) {
    return back(product.slug, "download_no_access");
  }

  if (!product.download_path) {
    return back(product.slug, "download_no_file");
  }

  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(product.download_path, EXPIRES, { download: true });

  if (error || !data?.signedUrl) {
    return back(product.slug, "download_failed");
  }

  return NextResponse.redirect(data.signedUrl);
}
