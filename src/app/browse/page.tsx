import Link from "next/link";
import Form from "next/form";
import { getAllProducts } from "@/data/products";
import { ProductGrid } from "@/components/product-grid";
import { TYPE_LABEL } from "@/lib/labels";
import { fold } from "@/lib/fold";
import type { ProductType } from "@/lib/types";

export const metadata = { title: "Khám phá" };

const TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature", "software"];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; price?: string }>;
}) {
  const { q = "", type = "", price = "" } = await searchParams;
  const query = fold(q.trim());
  const freeOnly = price === "free";

  let products = await getAllProducts();
  if (type) products = products.filter((p) => p.type === type);
  if (freeOnly) products = products.filter((p) => p.tier === "free");
  if (query) {
    // Không phân biệt dấu: "rung chuong vang" vẫn ra "Rung Chuông Vàng".
    products = products.filter(
      (p) =>
        fold(p.title).includes(query) ||
        fold(p.tagline).includes(query) ||
        p.tags.some((t) => fold(t).includes(query))
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {q.trim() ? `Kết quả cho “${q.trim()}”` : freeOnly ? "Sản phẩm miễn phí" : "Khám phá sản phẩm"}
        </h1>
        <span className="text-base text-text-muted">{products.length} sản phẩm</span>
      </div>

      <Form action="/browse" className="flex max-w-[640px] gap-2 rounded-2xl border border-border-strong bg-bg-elevated p-1.5 focus-within:border-accent">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Tìm công cụ, game, biểu mẫu…"
          aria-label="Tìm sản phẩm"
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-text placeholder:text-text-faint focus:outline-none"
        />
        {type && <input type="hidden" name="type" value={type} />}
        {freeOnly && <input type="hidden" name="price" value="free" />}
        <button type="submit" className="shrink-0 rounded-xl bg-accent px-4 py-2.5 font-extrabold text-accent-contrast hover:bg-accent-hover">
          Tìm
        </button>
      </Form>

      {/* lọc theo loại + miễn phí (giữ nguyên q) */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href={buildHref(q, "", price)} active={!type}>
          Tất cả
        </FilterChip>
        {TYPES.map((t) => (
          <FilterChip key={t} href={buildHref(q, t, price)} active={type === t}>
            {TYPE_LABEL[t]}
          </FilterChip>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <FilterChip href={buildHref(q, type, freeOnly ? "" : "free")} active={freeOnly}>
          {freeOnly ? "✓ " : ""}Chỉ miễn phí
        </FilterChip>
      </div>

      {products.length === 0 && q.trim() ? (
        <p className="py-16 text-center text-base text-text-muted">
          Không tìm thấy sản phẩm nào cho “{q.trim()}”. Thử từ khóa ngắn hơn, hoặc{" "}
          <Link href="/browse" className="text-brand hover:text-brand-hover">
            xem tất cả sản phẩm
          </Link>
          .
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

function buildHref(q: string, type: string, price: string): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type) params.set("type", type);
  if (price) params.set("price", price);
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
      className={`rounded-full border px-3.5 py-1.5 text-[15px] transition ${
        active
          ? "border-accent bg-accent text-accent-contrast"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}
