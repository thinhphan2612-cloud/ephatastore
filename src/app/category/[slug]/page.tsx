import { notFound } from "next/navigation";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/data/categories";
import { getProductsByCategory } from "@/data/products";
import { ProductGrid } from "@/components/product-grid";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORY_BY_SLUG.get(slug);
  return { title: category?.name ?? "Danh mục" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORY_BY_SLUG.get(slug);
  if (!category) notFound();

  const products = await getProductsByCategory(category.slug);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="text-text-muted">{category.description}</p>
          )}
        </div>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
