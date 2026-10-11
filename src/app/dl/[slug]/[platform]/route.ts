import { NextResponse, type NextRequest } from "next/server";
import { getSoftwareProduct, listReleases } from "@/data/software";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { isPlatform } from "@/lib/software/version";

const FILES_BUCKET = "product-files";
const EXPIRES = 60 * 10; // 10 phút

/** Tải bộ cài (miễn phí, không cần đăng nhập). ?version= để tải bản cũ. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; platform: string }> }
) {
  const { slug, platform } = await params;
  if (!isPlatform(platform)) return new NextResponse("Nền tảng không hợp lệ.", { status: 404 });

  const product = await getSoftwareProduct(slug);
  if (!product) return new NextResponse("Sản phẩm không tồn tại.", { status: 404 });

  const version = request.nextUrl.searchParams.get("version");
  const release = (await listReleases(product.id)).find(
    (r) => r.platform === platform && (!version || r.version === version)
  );
  if (!release) return new NextResponse("Chưa có bộ cài cho nền tảng này.", { status: 404 });

  const { data, error } = await createStoreAdminClient()
    .storage.from(FILES_BUCKET)
    .createSignedUrl(release.storage_path, EXPIRES, { download: release.file_name });
  if (error || !data?.signedUrl) {
    return new NextResponse("Không tạo được link tải.", { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
