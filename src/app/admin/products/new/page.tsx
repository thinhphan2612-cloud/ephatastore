import Link from "next/link";
import { adminListCategories, adminListPublishers } from "@/data/admin";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const [categories, publishers] = await Promise.all([
    adminListCategories(),
    adminListPublishers(),
  ]);

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        / Thêm mới
      </div>
      <h2 className="text-lg font-semibold">Thêm sản phẩm</h2>
      <ProductForm categories={categories} publishers={publishers} />
    </div>
  );
}
