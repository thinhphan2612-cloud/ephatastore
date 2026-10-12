import Link from "next/link";
import type { Product } from "@/lib/types";
import { vndToPoints } from "@/lib/points";
import { kindsFor } from "@/lib/purchase-kinds";
import { TYPE_LABEL } from "@/lib/labels";

export function ProductCard({ product }: { product: Product }) {
  const isPro = product.tier === "pro";
  // Giá theo đúng cách bán (khớp trang sản phẩm): vĩnh viễn = giá 1 lần; công cụ / tính năng = gói năm.
  const kind = kindsFor(product.type)[0];
  const price =
    kind === "annual"
      ? `${vndToPoints(product.priceMonth * 12).toLocaleString("vi-VN")} point/năm`
      : `${vndToPoints(product.priceMonth).toLocaleString("vi-VN")} point · ${kind === "software" ? "key vĩnh viễn" : "vĩnh viễn"}`;

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
      <span className="relative z-10 self-start rounded-full border border-white/16 bg-black/35 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/85 backdrop-blur">
        {TYPE_LABEL[product.type]}
      </span>
      {/* Chưa có ảnh bìa: hiện logo / icon lớn để các thẻ không trông giống hệt nhau. */}
      <div className="relative z-10 mb-auto mt-4">
        {!product.coverUrl && (
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-black/35 text-[26px] text-accent backdrop-blur">
            {product.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (product.icon ?? "✦")
            )}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-[20px] font-bold leading-snug text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
          {product.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[14px] leading-[1.6] text-white/85 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
          {product.tagline}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
          <span className={`text-[13px] font-black ${isPro ? "text-accent-hover" : "text-success"}`}>
            {isPro ? price : "Miễn phí"}
          </span>
          <span className="text-xs text-white/75">Xem chi tiết →</span>
        </div>
      </div>
    </Link>
  );
}
