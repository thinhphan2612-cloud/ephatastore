import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isOwned } from "@/data/store-user";
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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const owned = await isOwned(user.id, productId);
  if (!owned) {
    return new NextResponse("Bạn chưa sở hữu sản phẩm này.", { status: 403 });
  }

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("download_path")
    .eq("id", productId)
    .maybeSingle();

  if (!product?.download_path) {
    return new NextResponse("Sản phẩm chưa có file tải về.", { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(product.download_path, EXPIRES, { download: true });

  if (error || !data?.signedUrl) {
    return new NextResponse("Không tạo được link tải.", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
