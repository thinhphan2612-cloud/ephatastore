import Link from "next/link";
import Form from "next/form";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug } from "@/data/categories";
import { getAllProducts } from "@/data/products";
import { Catalog } from "@/components/catalog";
import { readQuery } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.name ?? "Danh mục" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [products, categories, sp] = await Promise.all([getAllProducts(), getCategories(), searchParams]);
  const query = readQuery(sp);
  const base = `/category/${category.slug}`;

  return (
    <div>
      {/* Đầu trang gọn, cùng kiểu trang chủ: tên danh mục + mô tả + ô tìm trong danh mục */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-[min(1240px,calc(100%-40px))] flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8 sm:py-10">
          <div className="max-w-[700px]">
            <Link href="/#catalog" className="text-[13px] text-text-muted hover:text-text">
              ← Cửa hàng
            </Link>
            {category.eyebrow && (
              <div className="mt-4 text-xs font-extrabold uppercase tracking-[0.14em] text-accent-hover">{category.eyebrow}</div>
            )}
            <h1 className="font-display mt-2 flex items-center gap-3 text-[clamp(28px,4vw,42px)] font-bold leading-tight">
              <span className="text-accent">{category.icon}</span>
              {category.name}
            </h1>
            {category.description && <p className="mt-2 text-base text-text-muted">{category.description}</p>}
          </div>

          <Form
            action={base}
            scroll={false}
            className="flex w-full max-w-[460px] gap-2 rounded-2xl border border-border-strong bg-bg-elevated p-1.5 focus-within:border-accent"
          >
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Tìm trong danh mục…"
              aria-label={`Tìm trong ${category.name}`}
              className="min-w-0 flex-1 bg-transparent px-3 text-base text-text placeholder:text-text-faint focus:outline-none"
            />
            {query.price && <input type="hidden" name="price" value={query.price} />}
            {query.type && <input type="hidden" name="type" value={query.type} />}
            {query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
            <button type="submit" className="shrink-0 rounded-xl bg-accent px-4 py-2 font-extrabold text-accent-contrast hover:bg-accent-hover">
              Tìm
            </button>
          </Form>
        </div>
      </header>

      <div className="mx-auto w-[min(1240px,calc(100%-40px))] py-8 sm:py-10">
        <Catalog products={products} categories={categories} query={query} base={base} lockedCat={category.slug} />
      </div>
    </div>
  );
}
