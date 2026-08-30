import Link from "next/link";
import type { Product } from "@/lib/types";

/**
 * Hành động cho sản phẩm ĐÃ sở hữu, theo loại:
 *  - game            → chơi trên store
 *  - tool/asset/image → tải về (link ký có hạn)
 *  - feature         → tính năng tích hợp (dùng bên giaoly)
 */
export function OwnedActions({
  product,
  className = "",
}: {
  product: Pick<Product, "id" | "slug" | "type">;
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

  if (product.type === "feature") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-success/50 bg-success/10 px-4 py-2 text-sm font-medium text-success ${className}`}
      >
        ✓ Đã kích hoạt cho giáo xứ
      </span>
    );
  }

  // tool / asset / image → tải về
  return (
    <a href={`/download/${product.id}`} className={`${base} ${className}`}>
      ⬇ Tải về
    </a>
  );
}
