import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/labels";

export function ProductCard({ product }: { product: Product }) {
  const isPro = product.tier === "pro";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl border border-border p-6 transition hover:-translate-y-1 hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {/* ảnh full-card */}
      <div
        className="media-placeholder absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04]"
        style={product.coverUrl ? { background: `center/cover url(${product.coverUrl})` } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />

      {/* type badge + icon top */}
      <span className="relative z-10 mb-auto self-start rounded-full border border-white/16 bg-black/35 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/80 backdrop-blur">
        {TYPE_LABEL[product.type]}
      </span>

      <div className="relative z-10">
        <h3 className="text-[20px] font-bold [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
          {product.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.6] text-white/80 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
          {product.tagline}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
          <span
            className={`text-xs font-black ${isPro ? "text-accent-hover" : "text-success"}`}
          >
            {isPro ? `${formatPrice(product.priceMonth)}/tháng` : "Miễn phí"}
          </span>
          <span className="text-[11px] text-white/70">Xem chi tiết →</span>
        </div>
      </div>
    </Link>
  );
}
