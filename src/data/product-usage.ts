import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/**
 * Sản phẩm đã có người dùng tới mức nào — quyết định có được xóa cứng / đổi slug không.
 * - Xóa cứng bị chặn khi có quyền sở hữu, lịch sử mua, key, lượt trừ point của app, hoặc đã thêm vào Giáo Lý Số.
 * - Slug bị khóa trong các trường hợp trên + phần mềm đã có bản phát hành (slug nằm trong bản cài trên máy khách).
 */
export interface ProductUsage {
  entitlements: number;
  purchases: number;
  licenses: number;
  charges: number;
  giaolyLinks: number;
  releases: number;
}

export async function getProductUsage(productId: string): Promise<ProductUsage> {
  const supabase = createStoreAdminClient();
  const count = async (table: string) =>
    (await supabase.from(table).select("product_id", { count: "exact", head: true }).eq("product_id", productId)).count ?? 0;
  const [entitlements, purchases, licenses, charges, giaolyLinks, releases] = await Promise.all([
    count("entitlements"),
    count("purchases"),
    count("licenses"),
    count("app_charges"),
    count("giaoly_game_links"),
    count("software_releases"),
  ]);
  return { entitlements, purchases, licenses, charges, giaolyLinks, releases };
}

/** Lý do chặn xóa cứng (null = xóa được). */
export function deleteBlockReason(u: ProductUsage): string | null {
  const parts = [
    u.entitlements && `${u.entitlements} người có quyền dùng`,
    u.purchases && `${u.purchases} lượt mua`,
    u.licenses && `${u.licenses} key đã cấp`,
    u.charges && `${u.charges} lượt trừ point trong app`,
    u.giaolyLinks && `${u.giaolyLinks} lần thêm vào Giáo Lý Số`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Lý do khóa slug (null = đổi được). */
export function slugLockReason(u: ProductUsage): string | null {
  const block = deleteBlockReason(u);
  if (block) return block;
  return u.releases ? `${u.releases} bản phát hành phần mềm (slug đã nằm trong bản cài)` : null;
}
