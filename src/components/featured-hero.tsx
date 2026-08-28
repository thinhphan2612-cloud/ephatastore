import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { TYPE_ICON, TYPE_LABEL } from "@/lib/labels";
import { gradientFor } from "@/lib/placeholder";

export function FeaturedHero({ product }: { product: Product }) {
  const discount = discountPercent(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group grid overflow-hidden rounded-xl border border-border bg-surface md:grid-cols-2"
    >
      {/* ảnh lớn */}
      <div
        className="flex aspect-video items-center justify-center md:aspect-auto"
        style={{ background: gradientFor(product.id) }}
      >
        <span className="text-7xl opacity-80">{TYPE_ICON[product.type]}</span>
      </div>

      {/* nội dung */}
      <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
        <span className="text-sm font-medium uppercase tracking-wide text-accent">
          ✦ Nổi bật · {TYPE_LABEL[product.type]}
        </span>
        <h2 className="text-3xl font-bold text-text group-hover:text-accent">
          {product.title}
        </h2>
        <p className="text-text-muted">{product.description}</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {product.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          {discount > 0 && (
            <span className="rounded bg-discount px-2 py-1 text-sm font-bold text-white">
              -{discount}%
            </span>
          )}
          <div>
            {discount > 0 && (
              <span className="mr-2 text-sm text-text-faint line-through">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
            <span className="text-xl font-bold text-text">
              {formatPrice(product.price)}
            </span>
          </div>
          <span className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast group-hover:bg-accent-hover">
            Xem chi tiết
          </span>
        </div>
      </div>
    </Link>
  );
}
