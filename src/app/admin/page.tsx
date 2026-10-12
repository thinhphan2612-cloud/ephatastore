import { adminListProducts } from "@/data/admin";
import { ProductTable } from "@/components/admin/product-table";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const products = await adminListProducts();

  return (
    <div className="space-y-4">
      {notice && (
        <p role="alert" className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text">
          {notice}
        </p>
      )}
      <ProductTable products={products} />
    </div>
  );
}
