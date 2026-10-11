"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { slugify } from "@/lib/slug";

/**
 * Danh mục & nhà phát hành — admin thêm (ngay trong form sản phẩm hoặc /admin/catalog), sửa, đổi thứ tự, xóa.
 * Slug tạo từ tên lúc thêm và KHÔNG đổi về sau (URL /category/<slug> và liên kết sản phẩm dựa vào nó).
 */

export interface CategoryInput {
  name: string;
  icon?: string;
  eyebrow?: string;
  description?: string;
}
export interface PublisherInput {
  name: string;
  verified?: boolean;
}
export type CatalogResult = { ok: true; item: { id: string; name: string } } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

async function assertAdmin() {
  if (!(await getAdminUser())) throw new Error("Không có quyền admin.");
}

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function categoryRow(input: CategoryInput) {
  return {
    name: clean(input.name, 80),
    icon: clean(input.icon, 4) || "✦",
    eyebrow: clean(input.eyebrow, 60) || null,
    description: clean(input.description, 300) || null,
  };
}

/** Slug chưa dùng trong bảng: ten-danh-muc, ten-danh-muc-2, … */
async function uniqueSlug(table: "categories" | "publishers", name: string): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;
  const { data } = await createStoreAdminClient().from(table).select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- Danh mục ----------

export async function createCategory(input: CategoryInput): Promise<CatalogResult> {
  await assertAdmin();
  const row = categoryRow(input);
  if (!row.name) return { ok: false, error: "Nhập tên danh mục." };
  const slug = await uniqueSlug("categories", row.name);
  if (!slug) return { ok: false, error: "Tên danh mục phải có chữ hoặc số." };
  const supabase = createStoreAdminClient();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...row, slug, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id,name")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, item: data };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  await assertAdmin();
  const row = categoryRow(input);
  if (!row.name) return { ok: false, error: "Nhập tên danh mục." };
  const { error } = await createStoreAdminClient().from("categories").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Đổi chỗ với danh mục liền trước (-1) / liền sau (+1); đánh lại sort_order 1..n. */
export async function moveCategory(id: string, dir: -1 | 1): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createStoreAdminClient();
  const { data } = await supabase.from("categories").select("id").order("sort_order").order("created_at");
  const ids = (data ?? []).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (const [k, cid] of ids.entries()) {
    const { error } = await supabase.from("categories").update({ sort_order: k + 1 }).eq("id", cid);
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createStoreAdminClient();
  const [{ count: main }, { count: extra }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id),
    supabase.from("product_categories").select("product_id", { count: "exact", head: true }).eq("category_id", id),
  ]);
  const n = Math.max(main ?? 0, extra ?? 0);
  if (n > 0) return { ok: false, error: `Còn ${n} sản phẩm trong danh mục này — chuyển chúng sang danh mục khác trước.` };
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- Nhà phát hành ----------

export async function createPublisher(input: PublisherInput): Promise<CatalogResult> {
  await assertAdmin();
  const name = clean(input.name, 80);
  if (!name) return { ok: false, error: "Nhập tên nhà phát hành." };
  const slug = await uniqueSlug("publishers", name);
  if (!slug) return { ok: false, error: "Tên nhà phát hành phải có chữ hoặc số." };
  const { data, error } = await createStoreAdminClient()
    .from("publishers")
    .insert({ name, slug, verified: !!input.verified })
    .select("id,name")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, item: data };
}

export async function updatePublisher(id: string, input: PublisherInput): Promise<ActionResult> {
  await assertAdmin();
  const name = clean(input.name, 80);
  if (!name) return { ok: false, error: "Nhập tên nhà phát hành." };
  const { error } = await createStoreAdminClient()
    .from("publishers")
    .update({ name, verified: !!input.verified })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deletePublisher(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = createStoreAdminClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("publisher_id", id);
  if (count) return { ok: false, error: `Còn ${count} sản phẩm của nhà phát hành này — chuyển chúng sang nhà phát hành khác trước.` };
  const { error } = await supabase.from("publishers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
