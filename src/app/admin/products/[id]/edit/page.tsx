import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminGetProduct,
  adminListCategories,
  adminListPublishers,
} from "@/data/admin";
import { ProductForm } from "@/components/admin/product-form";

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

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        / Sửa
      </div>
      <h2 className="text-lg font-semibold">Sửa: {product.title}</h2>
      {product.type === "software" && (
        <div className="flex gap-4 border-b border-border text-sm">
          <span className="border-b-2 border-accent pb-2 font-semibold text-text">Thông tin</span>
          <Link href={`/admin/products/${product.id}/releases`} className="pb-2 text-text-muted hover:text-text">
            Phiên bản
          </Link>
        </div>
      )}
      <ProductForm
        categories={categories}
        publishers={publishers}
        product={product}
        preset={product.type === "software" ? "software" : "full"}
      />
    </div>
  );
}
