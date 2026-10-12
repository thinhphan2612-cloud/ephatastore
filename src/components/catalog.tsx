import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { TYPE_LABEL } from "@/lib/labels";
import { SORTS, catalogHref, filterProducts, sortProducts, type CatalogQuery } from "@/lib/catalog";
import type { Category, Product, ProductType } from "@/lib/types";

const TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature", "software"];
const typeLabel = (t: ProductType) => (t === "feature" ? "Tính năng GLS" : TYPE_LABEL[t]);

/**
 * Cửa hàng có bộ lọc: sidebar trái (danh mục / giá / loại, chọn 1 mỗi nhóm, có số đếm) + lưới thẻ.
 * `limit` (trang chủ): chỉ hiện N thẻ đầu, kèm link "Xem tất cả" sang /browse cùng bộ lọc.
 */
export function Catalog({
  products,
  categories,
  query,
  base,
  limit,
}: {
  products: Product[];
  categories: Category[];
  query: CatalogQuery;
  base: string;
  limit?: number;
}) {
  const result = sortProducts(filterProducts(products, query), query.sort);
  const shown = limit ? result.slice(0, limit) : result;
  const href = (patch: Partial<CatalogQuery>) => catalogHref(base, query, patch);

  // Số đếm mỗi lựa chọn = áp các bộ lọc của nhóm KHÁC (đổi lựa chọn trong nhóm sẽ ra đúng số này).
  const byCat = filterProducts(products, query, "cat");
  const byPrice = filterProducts(products, query, "price");
  const byType = filterProducts(products, query, "type");
  const inCat = (slug: string) => byCat.filter((p) => p.categoryId === slug || p.categorySlugs.includes(slug)).length;

  const groups: { title: string; items: { label: string; count: number; active: boolean; href: string }[] }[] = [
    {
      title: "Danh mục",
      items: [
        { label: "Tất cả", count: byCat.length, active: !query.cat, href: href({ cat: "" }) },
        ...categories.map((c) => ({ label: c.name, count: inCat(c.slug), active: query.cat === c.slug, href: href({ cat: c.slug }) })),
      ],
    },
    {
      title: "Giá",
      items: [
        { label: "Tất cả", count: byPrice.length, active: !query.price, href: href({ price: "" }) },
        { label: "Miễn phí", count: byPrice.filter((p) => p.tier === "free").length, active: query.price === "free", href: href({ price: "free" }) },
        { label: "Có phí", count: byPrice.filter((p) => p.tier !== "free").length, active: query.price === "paid", href: href({ price: "paid" }) },
      ],
    },
    {
      title: "Loại",
      items: [
        { label: "Tất cả", count: byType.length, active: !query.type, href: href({ type: "" }) },
        ...TYPES.map((t) => ({ label: typeLabel(t), count: byType.filter((p) => p.type === t).length, active: query.type === t, href: href({ type: t }) })),
      ],
    },
  ];

  // Chip các bộ lọc đang bật (bấm để bỏ).
  const chips = [
    query.q && { label: `“${query.q}”`, href: href({ q: "" }) },
    query.cat && { label: categories.find((c) => c.slug === query.cat)?.name ?? query.cat, href: href({ cat: "" }) },
    query.price && { label: query.price === "free" ? "Miễn phí" : "Có phí", href: href({ price: "" }) },
    query.type && { label: TYPES.includes(query.type as ProductType) ? typeLabel(query.type as ProductType) : query.type, href: href({ type: "" }) },
  ].filter(Boolean) as { label: string; href: string }[];

  const filters = (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.12em] text-text-faint">{g.title}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.label}>
                <Link
                  href={it.href}
                  scroll={false}
                  aria-current={it.active ? "true" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[15px] transition ${
                    it.active
                      ? "bg-accent/15 font-semibold text-text"
                      : it.count
                        ? "text-text-muted hover:bg-surface-hover hover:text-text"
                        : "text-text-faint/70 hover:bg-surface-hover"
                  }`}
                >
                  <span className="min-w-0 truncate">{it.label}</span>
                  <span className={`shrink-0 text-xs tabular-nums ${it.active ? "text-accent" : "text-text-faint"}`}>{it.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div id="catalog" className="grid scroll-mt-20 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Bộ lọc sản phẩm" className="hidden self-start lg:sticky lg:top-20 lg:block">
        {filters}
      </aside>

      <div className="min-w-0">
        {/* Điện thoại / máy tính bảng: bộ lọc thu vào một nút */}
        <details className="mb-4 rounded-xl border border-border bg-surface lg:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-[15px] font-semibold text-text">
            Bộ lọc{chips.length ? ` (${chips.length})` : ""}
          </summary>
          <div className="border-t border-border p-3">{filters}</div>
        </details>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-text-muted">
            <b className="text-text">{result.length}</b> sản phẩm
          </p>
          <SortSelect
            value={query.sort}
            options={SORTS.map((s) => ({ key: s.key, label: s.label, href: href({ sort: s.key }) }))}
          />
        </div>

        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                scroll={false}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm text-text hover:border-accent"
              >
                {c.label} <span aria-label="Bỏ lọc">✕</span>
              </Link>
            ))}
            <Link href={base} scroll={false} className="text-sm text-brand hover:text-brand-hover">
              Xóa bộ lọc
            </Link>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-14 text-center text-base text-text-muted">
            Không có sản phẩm nào khớp bộ lọc.{" "}
            <Link href={base} scroll={false} className="text-brand hover:text-brand-hover">
              Xóa bộ lọc
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {limit && result.length > limit && (
          <div className="mt-6 text-center">
            <Link
              href={catalogHref("/browse", query)}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-3 text-base font-semibold text-text hover:border-accent/60"
            >
              Xem tất cả {result.length} sản phẩm →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
