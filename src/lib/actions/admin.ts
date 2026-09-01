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

const COVER_BUCKET = "product-covers";

const FILES_BUCKET = "product-files";

/** Upload ảnh bìa lên Storage public, trả về public URL. */
async function uploadCover(file: File): Promise<string> {
  const supabase = createStoreAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Lỗi upload ảnh: ${error.message}`);
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Upload file tải về lên bucket PRIVATE, trả về path (không phải URL). */
async function uploadDownloadFile(file: File): Promise<string> {
  const supabase = createStoreAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}/${safeName}`;
  const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Lỗi upload file: ${error.message}`);
  return path;
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
    game_url: String(formData.get("game_url") ?? "").trim() || null,
    app_url: String(formData.get("app_url") ?? "").trim() || null,
    giaoly_feature_key: String(formData.get("giaoly_feature_key") ?? "").trim() || null,
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

  // Ảnh bìa upload (nếu có) ghi đè cover_url từ text field.
  const file = formData.get("cover_file");
  if (file instanceof File && file.size > 0) {
    try {
      row.cover_url = await uploadCover(file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Lỗi upload ảnh." };
    }
  }

  const payload: Record<string, unknown> = { ...row };

  // File tải về upload (nếu có) → path trong bucket private.
  const dfile = formData.get("download_file");
  if (dfile instanceof File && dfile.size > 0) {
    try {
      payload.download_path = await uploadDownloadFile(dfile);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Lỗi upload file." };
    }
  }

  const supabase = createStoreAdminClient();
  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);

  if (error) {
    if (error.code === "23505") return { error: `Slug "${row.slug}" đã tồn tại.` };
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

const GAMES_BUCKET = "games";

/** Xóa đệ quy mọi file trong 1 thư mục của bucket (best-effort). */
async function removeStorageFolder(
  supabase: ReturnType<typeof createStoreAdminClient>,
  bucket: string,
  prefix: string
) {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files: string[] = [];
  const folders: string[] = [];
  for (const item of data) {
    // Supabase trả thư mục với id === null.
    if (item.id === null) folders.push(`${prefix}/${item.name}`);
    else files.push(`${prefix}/${item.name}`);
  }
  if (files.length) await supabase.storage.from(bucket).remove(files);
  for (const f of folders) await removeStorageFolder(supabase, bucket, f);
}

export async function deleteProduct(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();

  // Lấy thông tin để dọn Storage sau khi xóa row.
  const { data: prod } = await supabase
    .from("products")
    .select("game_url,download_path")
    .eq("id", id)
    .maybeSingle();

  // Xóa row (entitlements + product_categories cascade; order_items RESTRICT sẽ chặn).
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503")
      throw new Error(
        "Sản phẩm đã nằm trong đơn hàng nên không xóa cứng được. Hãy bỏ tích 'Hiện' để ẩn khỏi store."
      );
    throw new Error(error.message);
  }

  // Dọn Storage (best-effort): thư mục game/tool host + file tải về.
  const gameId = prod?.game_url?.match(/^\/g\/([^/]+)\//)?.[1];
  if (gameId) await removeStorageFolder(supabase, GAMES_BUCKET, gameId);
  if (prod?.download_path)
    await supabase.storage.from(FILES_BUCKET).remove([prod.download_path]);

  revalidatePath("/admin");
  redirect("/admin");
}

// ---- Quyền sở hữu của user ----

/** Cấp một sản phẩm cho user (thủ công). */
export async function grantEntitlement(formData: FormData) {
  await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!userId || !productId) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: userId, product_id: productId },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/users/${userId}`);
}

/** Thu hồi một sản phẩm khỏi user. */
export async function revokeEntitlement(formData: FormData) {
  await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!userId || !productId) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("entitlements")
    .delete()
    .eq("store_user_id", userId)
    .eq("product_id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/users/${userId}`);
}

// ---- Cấu hình nhanh sản phẩm (tier / giá / trial / active) ----
export async function updateProductConfig(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const tier = formData.get("tier") === "pro" ? "pro" : "free";
  const priceMonth = tier === "pro" ? Number(formData.get("price_month") ?? 0) || 0 : 0;
  const patch = {
    tier,
    min_plan: tier,
    price_month: priceMonth,
    price_vnd: priceMonth,
    trial: tier === "pro" && formData.get("trial") === "on",
    trial_days: Number(formData.get("trial_days") ?? 7) || 7,
    active: formData.get("active") === "on",
  };

  const supabase = createStoreAdminClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// ---- Coupon ----
export async function createCoupon(formData: FormData) {
  await assertAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = formData.get("kind") === "amount" ? "amount" : "percent";
  const value = Number(formData.get("value") ?? 0) || 0;
  if (!code || value <= 0) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("discount_codes")
    .insert({ code, kind, value, active: true });
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("next") === "true";
  const supabase = createStoreAdminClient();
  await supabase.from("discount_codes").update({ active: next }).eq("id", id);
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const supabase = createStoreAdminClient();
  await supabase.from("discount_codes").delete().eq("id", id);
  revalidatePath("/admin/coupons");
}

// ---- Cài đặt / chính sách ----
export async function saveSettings(formData: FormData) {
  await assertAdmin();
  const fullToppingPrice = Number(formData.get("full_topping_price") ?? 0) || 0;
  const freedomDays = Number(formData.get("freedom_days") ?? 30) || 30;
  const accessMode = formData.get("access_mode") === "store" ? "store" : "giaoly_pro";

  const supabase = createStoreAdminClient();
  const { error } = await supabase.from("store_settings").upsert(
    [
      { key: "full_topping_price", value: String(fullToppingPrice) },
      { key: "freedom_days", value: String(freedomDays) },
      { key: "access_mode", value: accessMode },
    ],
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
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
