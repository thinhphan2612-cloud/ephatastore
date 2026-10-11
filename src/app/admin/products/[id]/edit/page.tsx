import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminGetProduct,
  adminListCategories,
  adminListPublishers,
} from "@/data/admin";
import { listReleases } from "@/data/software";
import { parseGameUrl } from "@/lib/hosted-access";
import { ProductForm } from "@/components/admin/product-form";
import { SoftwareReleases } from "@/components/admin/software-releases";
import { HostedBuildUploader } from "@/components/admin/hosted-build-uploader";
import { AppSecretPanel } from "@/components/admin/app-secret-panel";
import { publicKeyBase64 } from "@/lib/software/license";
import { getProductUsage, slugLockReason } from "@/data/product-usage";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, publishers, usage] = await Promise.all([
    adminGetProduct(id),
    adminListCategories(),
    adminListPublishers(),
    getProductUsage(id),
  ]);

  if (!product) notFound();

  const isSoftware = product.type === "software";
  const hosted = parseGameUrl(product.game_url);
  const releases = isSoftware ? await listReleases(id) : [];
  // App ngoài (Link ngoài): khóa bí mật server để gọi /api/apps/v1. Tính năng Giáo Lý Số không dùng.
  const isExternalApp = !hosted && product.type === "tool";
  // Form theo đúng loại hiện tại — không cho chuyển loại tùy ý (đổi loại sau khi bán làm sai giá / cách giao hàng).
  const preset =
    isSoftware ? "software"
    : hosted ? "hosted"
    : product.type === "asset" || product.type === "image" ? "download"
    : product.type === "feature" ? "feature"
    : product.type === "tool" ? "link"
    : "full";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ephatastore.com").replace(/\/$/, "");
  let publicKey = "(chưa cấu hình SOFTWARE_LICENSE_SIGNING_JWK)";
  try {
    publicKey = publicKeyBase64();
  } catch {}
  const currentReleases = {
    windows: releases.find((r) => r.platform === "windows"),
    macos: releases.find((r) => r.platform === "macos"),
  };

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        / Sửa
      </div>
      <h2 className="text-lg font-semibold">Sửa: {product.title}</h2>
      {hosted && (
        <HostedBuildUploader
          productId={product.id}
          gameId={hosted.gameId}
          prevGameId={parseGameUrl(product.game_url_prev)?.gameId ?? null}
        />
      )}
      <ProductForm
        categories={categories}
        publishers={publishers}
        product={product}
        preset={preset}
        currentReleases={currentReleases}
        slugLockedReason={slugLockReason(usage)}
      />
      {isSoftware && <SoftwareReleases slug={product.slug} releases={releases} />}
      {isExternalApp && product.uses_wallet && !product.has_app_secret && (
        <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Đã bật “App trừ point qua Ví Ephata” nhưng chưa có khóa bí mật — app chưa gọi được API Ví. Tạo khóa ở khung dưới.
        </p>
      )}
      {isExternalApp && (
        <AppSecretPanel
          productId={product.id}
          slug={product.slug}
          hasSecret={product.has_app_secret}
          apiBase={`${site}/api/apps/v1`}
          publicKey={publicKey}
        />
      )}
    </div>
  );
}
