import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { TYPE_ICON, TYPE_LABEL } from "@/lib/labels";
import { gradientFor } from "@/lib/placeholder";

export function ProductCard({ product }: { product: Product }) {
  const discount = discountPercent(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition hover:border-accent/50 hover:bg-surface-hover"
    >
      {/* ảnh bìa */}
      <div
        className="relative flex aspect-[3/2] items-center justify-center"
        style={{ background: product.coverUrl ? undefined : gradientFor(product.id) }}
      >
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverUrl}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl opacity-70">{TYPE_ICON[product.type]}</span>
        )}

        {/* badge góc trên */}
        <div className="absolute left-2 top-2 flex gap-1">
          {product.isNew && (
            <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Mới
            </span>
          )}
          {product.minPlan === "pro" && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-contrast">
              Pro
            </span>
          )}
        </div>
      </div>

      {/* thông tin */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-1.5 text-xs text-text-faint">
          <span>{TYPE_LABEL[product.type]}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5">
            <span className="text-accent">★</span>
            {product.rating.toFixed(1)}
          </span>
        </div>

        <h3 className="line-clamp-1 font-semibold text-text group-hover:text-accent">
          {product.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-text-muted">{product.tagline}</p>

        <div className="mt-1 flex items-center gap-2">
          {discount > 0 && (
            <span className="rounded bg-discount px-1.5 py-0.5 text-xs font-bold text-white">
              -{discount}%
            </span>
          )}
          <div className="ml-auto text-right">
            {discount > 0 && (
              <span className="mr-1.5 text-xs text-text-faint line-through">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
            <span className="font-semibold text-text">{formatPrice(product.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
