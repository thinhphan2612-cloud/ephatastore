import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

export function ProductRow({
  title,
  products,
  moreHref,
}: {
  title: string;
  products: Product[];
  moreHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-text">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-sm text-brand hover:text-brand-hover">
            Xem tất cả →
          </Link>
        )}
      </div>

      {/* cuộn ngang trên mọi kích thước, thẻ giữ chiều rộng cố định */}
      <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-64 shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
