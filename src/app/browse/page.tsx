import Link from "next/link";
import { getAllProducts } from "@/data/products";
import { ProductGrid } from "@/components/product-grid";
import { TYPE_LABEL } from "@/lib/labels";
import type { ProductType } from "@/lib/types";

export const metadata = { title: "Khám phá" };

const TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature"];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  let products = getAllProducts();
  if (type) products = products.filter((p) => p.type === type);
  if (query) {
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.tagline.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {query ? `Kết quả cho “${q}”` : "Khám phá sản phẩm"}
        </h1>
        <span className="text-sm text-text-muted">{products.length} sản phẩm</span>
      </div>

      {/* lọc theo loại (giữ nguyên q) */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href={buildHref(query, "")} active={!type}>
          Tất cả
        </FilterChip>
        {TYPES.map((t) => (
          <FilterChip key={t} href={buildHref(query, t)} active={type === t}>
            {TYPE_LABEL[t]}
          </FilterChip>
        ))}
      </div>

      <ProductGrid products={products} />
    </div>
  );
}

function buildHref(q: string, type: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-accent bg-accent text-accent-contrast"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}
