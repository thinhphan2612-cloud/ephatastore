import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const metadata = { title: "Danh mục & Nhà phát hành" };

export default async function CatalogPage() {
  const supabase = createStoreAdminClient();
  const [{ data: cats }, { data: pubs }, { data: prods }, { data: links }] = await Promise.all([
    supabase.from("categories").select("id,slug,name,icon,eyebrow,description").order("sort_order").order("created_at"),
    supabase.from("publishers").select("id,slug,name,verified").order("name"),
    supabase.from("products").select("id,category_id,publisher_id"),
    supabase.from("product_categories").select("product_id,category_id"),
  ]);

  // Số sản phẩm theo danh mục: danh mục chính + danh mục phụ (product_categories), không đếm trùng.
  const inCat = new Map<string, Set<string>>();
  const add = (c: string | null, p: string) => c && (inCat.get(c) ?? inCat.set(c, new Set()).get(c)!).add(p);
  for (const p of prods ?? []) add(p.category_id, p.id);
  for (const l of links ?? []) add(l.category_id, l.product_id);
  const byPub = new Map<string, number>();
  for (const p of prods ?? []) if (p.publisher_id) byPub.set(p.publisher_id, (byPub.get(p.publisher_id) ?? 0) + 1);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Danh mục & Nhà phát hành</h2>
      <p className="max-w-2xl text-sm text-text-muted">
        Danh mục hiện trên trang chủ theo thứ tự dưới đây. Đường dẫn (slug) tạo từ tên lúc thêm và không đổi khi sửa tên.
        Chỉ xóa được khi không còn sản phẩm nào gắn vào.
      </p>
      <CatalogManager
        categories={(cats ?? []).map((c) => ({ ...c, products: inCat.get(c.id)?.size ?? 0 }))}
        publishers={(pubs ?? []).map((p) => ({ ...p, products: byPub.get(p.id) ?? 0 }))}
      />
    </div>
  );
}
