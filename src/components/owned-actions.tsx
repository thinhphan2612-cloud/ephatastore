import Link from "next/link";
import type { Product } from "@/lib/types";

/**
 * Hành động cho sản phẩm ĐÃ sở hữu, theo loại:
 *  - game            → chơi trên store (/play)
 *  - tool / feature  → mở web-app qua /launch (kiểm quyền, xin phép Ví nếu cần, gửi launch token) — tab mới
 *  - asset / image   → tải về (link ký có hạn)
 *  - software        → trang sản phẩm (chọn bộ cài theo hệ điều hành)
 *  - tính năng Giáo Lý Số (giaolyFeatureKey) → bật cho cả giáo xứ bên Giáo Lý Số: mở app GLS + trạng thái đồng bộ
 */

export type FeatureSync = "done" | "failed" | "pending" | null;
const GIAOLY_APP_URL = process.env.NEXT_PUBLIC_APP_GIAOLY_URL || "https://app.giaoly.com.vn";
export function OwnedActions({
  product,
  className = "",
  featureSync,
}: {
  product: Pick<Product, "id" | "slug" | "type" | "appUrl" | "giaolyFeatureKey">;
  className?: string;
  /** Trạng thái lần đồng bộ gần nhất sang Giáo Lý Số (chỉ tính năng GLS; undefined = không hiển thị). */
  featureSync?: FeatureSync;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover";

  if (product.type === "game") {
    return (
      <Link href={`/play/${product.slug}`} className={`${base} ${className}`}>
        ▶ Chơi ngay
      </Link>
    );
  }

  if (product.giaolyFeatureKey) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <a href={GIAOLY_APP_URL} target="_blank" rel="noopener noreferrer" className={`${base} w-full`}>
          Mở Giáo Lý Số ↗
        </a>
        {featureSync === "done" && <p className="text-center text-xs text-success">✓ Đã bật cho giáo xứ trên Giáo Lý Số</p>}
        {(featureSync === "failed" || featureSync === "pending") && (
          <p className="text-center text-xs text-warn">
            Đang chờ bật bên Giáo Lý Số. Quá 1 giờ chưa thấy?{" "}
            <Link href="/lien-he?chu-de=mua-hang" className="underline">
              Liên hệ
            </Link>
          </p>
        )}
      </div>
    );
  }

  if (product.type === "tool" || product.type === "feature") {
    if (product.appUrl) {
      return (
        <a
          href={`/launch/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${className}`}
        >
          Dùng ngay ↗
        </a>
      );
    }
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-text-faint ${className}`}
      >
        Sắp có
      </span>
    );
  }

  if (product.type === "software") {
    return (
      <Link href={`/product/${product.slug}`} className={`${base} ${className}`}>
        ⬇ Tải bộ cài
      </Link>
    );
  }

  // asset / image → tải về
  return (
    <a href={`/download/${product.id}`} className={`${base} ${className}`}>
      ⬇ Tải về
    </a>
  );
}
