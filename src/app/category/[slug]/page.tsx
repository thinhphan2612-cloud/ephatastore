import Link from "next/link";
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

  const products = await getProductsByCategory(category.id);

  return (
    <div>
      <header className="border-b border-border">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-[clamp(40px,7vw,70px)]">
          <Link href="/#categories" className="text-[13px] text-text-muted hover:text-text">
            ← Tất cả danh mục
          </Link>
          {category.eyebrow && (
            <div className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
              {category.eyebrow}
            </div>
          )}
          <h1 className="font-display mt-2 flex items-center gap-3 text-[clamp(36px,7vw,64px)] font-bold">
            <span className="text-accent">{category.icon}</span>
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-3 max-w-[760px] leading-[1.7] text-text-muted">
              {category.description}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-[clamp(32px,5vw,56px)]">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
