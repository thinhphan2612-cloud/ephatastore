import { cache } from "react";
import type { Category } from "@/lib/types";
import { createStoreClient } from "@/lib/supabase/store";

/**
 * Danh mục theo ĐỐI TƯỢNG — đọc từ bảng categories (admin thêm/sửa ở /admin/catalog).
 * id = slug (sản phẩm tham chiếu danh mục bằng slug qua product_categories).
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createStoreClient()
    .from("categories")
    .select("slug,name,icon,eyebrow,description")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Lỗi tải danh mục: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? "✦",
    eyebrow: c.eyebrow ?? undefined,
    description: c.description ?? undefined,
  }));
});

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}
