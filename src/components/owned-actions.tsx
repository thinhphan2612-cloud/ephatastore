import Link from "next/link";
import type { Product } from "@/lib/types";

/**
 * Hành động cho sản phẩm ĐÃ sở hữu, theo loại:
 *  - game            → chơi trên store (/play)
 *  - tool / feature  → mở web-app (app_url) tab mới
 *  - asset / image   → tải về (link ký có hạn)
 */
export function OwnedActions({
  product,
  className = "",
}: {
  product: Pick<Product, "id" | "slug" | "type" | "appUrl">;
  className?: string;
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

  if (product.type === "tool" || product.type === "feature") {
    if (product.appUrl) {
      return (
        <a
          href={product.appUrl}
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

  // asset / image → tải về
  return (
    <a href={`/download/${product.id}`} className={`${base} ${className}`}>
      ⬇ Tải về
    </a>
  );
}
