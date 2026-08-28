"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { slugify } from "@/lib/slug";

async function assertAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Không có quyền admin.");
}

export interface SaveState {
  error?: string;
}

function parseProduct(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const originalPrice = String(formData.get("original_price_vnd") ?? "").trim();
  const minPlan = String(formData.get("min_plan") ?? "").trim();
  const releasedAt = String(formData.get("released_at") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title,
    slug: slugInput ? slugify(slugInput) : slugify(title),
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    type: String(formData.get("type") ?? "tool"),
    category_id: String(formData.get("category_id") ?? ""),
    publisher_id: String(formData.get("publisher_id") ?? ""),
    price_vnd: Number(formData.get("price_vnd") ?? 0) || 0,
    original_price_vnd: originalPrice ? Number(originalPrice) : null,
    cover_url: String(formData.get("cover_url") ?? "").trim() || null,
    tags,
    min_plan: minPlan === "free" || minPlan === "pro" ? minPlan : null,
    released_at: releasedAt || null,
    featured: formData.get("featured") === "on",
    is_new: formData.get("is_new") === "on",
    is_popular: formData.get("is_popular") === "on",
    published: formData.get("published") === "on",
  };
}

export async function saveProduct(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const row = parseProduct(formData);

  if (!row.title) return { error: "Thiếu tiêu đề." };
  if (!row.category_id) return { error: "Chưa chọn danh mục." };
  if (!row.publisher_id) return { error: "Chưa chọn nhà phát hành." };

  const supabase = createStoreAdminClient();
  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);

  if (error) {
    if (error.code === "23505") return { error: `Slug "${row.slug}" đã tồn tại.` };
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteProduct(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function togglePublish(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ published: next })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
