import Link from "next/link";
import type { Product, ProductType } from "@/lib/types";
import { vndToPoints } from "@/lib/points";
import { kindsFor } from "@/lib/purchase-kinds";
import { TYPE_LABEL } from "@/lib/labels";

// Nền khung ảnh khi chưa có ảnh bìa — mỗi loại một tông để lưới không trông giống hệt nhau.
const TINT: Record<ProductType, string> = {
  tool: "#3f6f95",
  game: "#6a5a9a",
  asset: "#8d7040",
  image: "#357f80",
  feature: "#3d7f5f",
  software: "#4f5f78",
};

export function ProductCard({ product }: { product: Product }) {
  const isPro = product.tier === "pro";
  // Giá theo đúng cách bán (khớp trang sản phẩm): vĩnh viễn = giá 1 lần; công cụ / tính năng = gói năm.
  const kind = kindsFor(product.type)[0];
  const points = vndToPoints(kind === "annual" ? product.priceMonth * 12 : product.priceMonth);
  const priceNote = kind === "annual" ? "thuê bao 1 năm" : kind === "software" ? "key vĩnh viễn" : "mua 1 lần, dùng mãi";
  // Mô tả ngắn trùng tên (dữ liệu cũ) thì bỏ, đỡ lặp chữ.
  const tagline =
    product.tagline && product.tagline.trim().toLowerCase() !== product.title.trim().toLowerCase() ? product.tagline : "";
  const mark = product.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.logoUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    (product.icon ?? "✦")
  );

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {/* Khung ảnh: chỉ có ảnh, không đè chữ */}
      <div className="relative aspect-video overflow-hidden border-b border-border">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center"
            style={{ background: `linear-gradient(150deg, ${TINT[product.type] ?? "#4f5f78"} 0%, #1b1f24 85%)` }}
          >
            <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-black/25 text-[30px] text-[#f3d27a]">
              {mark}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">
          {TYPE_LABEL[product.type]}
        </span>
        {/* Cờ Nổi bật (admin bật ở trang Sửa) — màu cố định để rõ trên mọi ảnh, cả 2 theme. */}
        {product.featured && (
          <span className="absolute right-3 top-3 rounded-md bg-[#e0bf65] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#14110a] shadow">
            ★ Nổi bật
          </span>
        )}
      </div>

      {/* Phần chữ trên nền đặc: luôn đọc rõ ở cả 2 theme */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4">
          <div className="flex items-start gap-3">
            {product.coverUrl && (
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg-elevated text-lg text-accent">
                {mark}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-text">{product.title}</h3>
              {product.publisher?.name && (
                <p className="mt-0.5 truncate text-[13px] text-text-faint">{product.publisher.name}</p>
              )}
            </div>
          </div>
          {tagline && <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-text-muted">{tagline}</p>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          {kind === "software" ? (
            // Phần mềm luôn có bản miễn phí; có key bán thì thêm nhãn "Bản Pro" — giá key chỉ hiện ở trang sản phẩm.
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <span className="rounded-md bg-success/15 px-2.5 py-1 text-[13px] font-bold text-success">Bản miễn phí</span>
              {isPro && points > 0 && (
                <span className="rounded-md bg-accent/15 px-2.5 py-1 text-[13px] font-bold text-accent">Bản Pro</span>
              )}
            </div>
          ) : isPro ? (
            <div className="min-w-0">
              <div className="whitespace-nowrap">
                <b className="text-[17px] tabular-nums text-text">{points.toLocaleString("vi-VN")}</b>{" "}
                <span className="text-[13px] font-semibold text-text-muted">point</span>
              </div>
              <div className="text-xs text-text-faint">{priceNote}</div>
            </div>
          ) : (
            <span className="rounded-md bg-success/15 px-2.5 py-1 text-[13px] font-bold text-success">Miễn phí</span>
          )}
          <span className="shrink-0 text-[13px] font-semibold text-brand group-hover:text-brand-hover">Xem →</span>
        </div>
      </div>
    </Link>
  );
}
