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

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, publishers] = await Promise.all([
    adminGetProduct(id),
    adminListCategories(),
    adminListPublishers(),
  ]);

  if (!product) notFound();

  const isSoftware = product.type === "software";
  const hosted = parseGameUrl(product.game_url);
  const releases = isSoftware ? await listReleases(id) : [];
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
      {hosted && <HostedBuildUploader productId={product.id} gameId={hosted.gameId} />}
      <ProductForm
        categories={categories}
        publishers={publishers}
        product={product}
        preset={isSoftware ? "software" : hosted ? "hosted" : "full"}
        currentReleases={currentReleases}
      />
      {isSoftware && <SoftwareReleases slug={product.slug} releases={releases} />}
    </div>
  );
}
