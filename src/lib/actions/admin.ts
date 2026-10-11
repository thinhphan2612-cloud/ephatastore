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

export interface SaveState {
  error?: string;
}

/**
 * Bước 1 khi lưu sản phẩm có file: tạo signed upload URL để TRÌNH DUYỆT tải thẳng lên Storage
 * (server action giới hạn body 1MB, Vercel ~4.5MB — không cho file đi qua server).
 * cover → bucket public product-covers (ảnh bìa, ≤5MB) · download → bucket private product-files (≤50MB).
 */
export async function createProductUpload(input: {
  purpose: "cover" | "download";
  fileName: string;
}): Promise<{ bucket: string; path: string; token: string }> {
  await assertAdmin();
  const supabase = createStoreAdminClient();
  const bucket = input.purpose === "cover" ? COVER_BUCKET : FILES_BUCKET;
  const ext = (input.fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path =
    input.purpose === "cover"
      ? `${crypto.randomUUID()}.${ext}`
      : `${crypto.randomUUID()}/${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Lỗi tạo link upload: ${error?.message}`);
  return { bucket, path, token: data.token };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const COVER_PATH_RE = new RegExp(`^${UUID}\\.[a-z0-9]{1,5}$`);
const DOWNLOAD_PATH_RE = new RegExp(`^${UUID}/[A-Za-z0-9._-]+$`);

/** Đường dẫn trong bucket product-covers từ public URL (null nếu ảnh không nằm ở bucket này). */
function coverPathFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/product-covers\/(.+)$/);
  return m ? m[1] : null;
}

/** Loại bán MỘT LẦN dùng vĩnh viễn; còn lại (tool/feature) là thuê bao. */
const PERPETUAL_TYPES = ["asset", "image", "game", "software"];

function parseProduct(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const originalPrice = String(formData.get("original_price_vnd") ?? "").trim();
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
    original_price_vnd: originalPrice ? Number(originalPrice) : null,
    tags,
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

/**
 * Giá theo mô hình point: tier/price_month là thứ store dùng để bán (price_vnd giữ đồng bộ để hiển thị).
 * Form gửi: sale=free|paid, price (VND), trial, trial_days, giaoly_pro_free.
 * Phần mềm: chỉ có price (giá key) — > 0 là có phí; không bao giờ free theo Pro Giáo Lý Số.
 */
function parsePricing(
  formData: FormData,
  type: string
): Record<string, unknown> | { error: string } {
  const price = Math.max(0, Math.round(Number(formData.get("price") ?? 0) || 0));
  if (type === "software") {
    return {
      tier: price > 0 ? "pro" : "free",
      price_month: price,
      price_vnd: price,
      min_plan: null,
      giaoly_pro_free: false,
      trial: false,
    };
  }
  const paid = formData.get("sale") === "paid";
  if (paid && price <= 0) return { error: "Nhập giá bán (VND) lớn hơn 0, hoặc chọn Miễn phí." };
  const subscription = !PERPETUAL_TYPES.includes(type);
  const tier = paid ? "pro" : "free";
  return {
    tier,
    min_plan: tier,
    price_month: paid ? price : 0,
    price_vnd: paid ? price : 0,
    trial: paid && subscription && formData.get("trial") === "on",
    trial_days: Math.min(60, Math.max(1, Number(formData.get("trial_days")) || 7)),
    giaoly_pro_free: paid && formData.get("giaoly_pro_free") === "on",
  };
}

/**
 * Lưu sản phẩm, KHÔNG redirect. Form gọi sau khi đã tải file (ảnh bìa / file tải về) thẳng lên Storage;
 * phần mềm cần id trả về để upload bộ cài tiếp.
 */
export async function saveProductData(formData: FormData): Promise<SaveState & { id?: string }> {
  const res = await persistProduct(formData);
  if (!res.error) revalidatePath("/admin");
  return res;
}

async function persistProduct(formData: FormData): Promise<SaveState & { id?: string }> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const row = parseProduct(formData);

  if (!row.title) return { error: "Thiếu tiêu đề." };
  if (!row.category_id) return { error: "Chưa chọn danh mục." };
  if (!row.publisher_id) return { error: "Chưa chọn nhà phát hành." };

  const pricing = parsePricing(formData, row.type);
  if ("error" in pricing) return { error: String(pricing.error) };

  const supabase = createStoreAdminClient();
  const payload: Record<string, unknown> = { ...row, ...pricing };

  // File đã được trình duyệt tải thẳng lên Storage (createProductUpload) → chỉ nhận đường dẫn.
  const coverPath = String(formData.get("cover_path") ?? "").trim();
  if (coverPath) {
    if (!COVER_PATH_RE.test(coverPath)) return { error: "Đường dẫn ảnh bìa không hợp lệ." };
    payload.cover_url = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath).data.publicUrl;
  }
  const downloadPath = String(formData.get("download_path") ?? "").trim();
  if (downloadPath) {
    if (!DOWNLOAD_PATH_RE.test(downloadPath)) return { error: "Đường dẫn file tải về không hợp lệ." };
    payload.download_path = downloadPath;
  }

  // Phần mềm bán key: cấu hình license + link Microsoft Store.
  if (row.type === "software") {
    const msStoreUrl = String(formData.get("ms_store_url") ?? "").trim();
    if (msStoreUrl && !/^https:\/\//.test(msStoreUrl))
      return { error: "Link Microsoft Store phải bắt đầu bằng https://" };
    Object.assign(payload, {
      license_device_limit: Math.max(1, Number(formData.get("license_device_limit")) || 2),
      // 0 = vĩnh viễn (không cần xác minh lại online).
      license_offline_days:
        formData.get("license_offline_forever") === "on"
          ? 0
          : Math.max(1, Number(formData.get("license_offline_days")) || 30),
      ms_store_url: msStoreUrl || null,
    });
  }

  // Bản cũ (khi sửa): danh mục để gỡ liên kết nếu đổi; file cũ để dọn sau khi thay.
  const { data: before } = id
    ? await supabase
        .from("products")
        .select("category_id,cover_url,download_path")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  const { data: saved, error } = id
    ? await supabase.from("products").update(payload).eq("id", id).select("id").single()
    : await supabase.from("products").insert(payload).select("id").single();

  if (error) {
    if (error.code === "23505") return { error: `Slug "${row.slug}" đã tồn tại.` };
    return { error: error.message };
  }

  // Dọn file cũ đã bị thay (best-effort).
  const oldCover = coverPath ? coverPathFromUrl(before?.cover_url) : null;
  if (oldCover && oldCover !== coverPath) await supabase.storage.from(COVER_BUCKET).remove([oldCover]);
  if (downloadPath && before?.download_path && before.download_path !== downloadPath)
    await supabase.storage.from(FILES_BUCKET).remove([before.download_path]);

  // Catalog đọc danh mục qua product_categories (nhiều-nhiều) → phải gắn danh mục chính vào đó.
  if (before?.category_id && before.category_id !== row.category_id) {
    await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", saved.id)
      .eq("category_id", before.category_id);
  }
  const { error: catErr } = await supabase
    .from("product_categories")
    .upsert(
      { product_id: saved.id, category_id: row.category_id },
      { onConflict: "product_id,category_id", ignoreDuplicates: true }
    );
  if (catErr) return { error: catErr.message };

  return { id: saved.id };
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
    .select("type,game_url,download_path")
    .eq("id", id)
    .maybeSingle();

  // Xóa row (entitlements + product_categories cascade; order_items RESTRICT sẽ chặn).
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503")
      throw new Error(
        prod?.type === "software"
          ? "Phần mềm đã bán key nên không xóa cứng được. Hãy bỏ tích 'Hiện' để ẩn khỏi store."
          : "Sản phẩm đã nằm trong đơn hàng nên không xóa cứng được. Hãy bỏ tích 'Hiện' để ẩn khỏi store."
      );
    throw new Error(error.message);
  }

  // Dọn Storage (best-effort): thư mục game/tool host + file tải về.
  const gameId = prod?.game_url?.match(/^\/g\/([^/]+)\//)?.[1];
  if (gameId) await removeStorageFolder(supabase, GAMES_BUCKET, gameId);
  if (prod?.download_path)
    await supabase.storage.from(FILES_BUCKET).remove([prod.download_path]);
  // Bộ cài phần mềm (software_releases cascade theo row).
  if (prod?.type === "software")
    await removeStorageFolder(supabase, FILES_BUCKET, `software/${id}`);

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
    giaoly_pro_free: tier === "pro" && formData.get("giaoly_pro_free") === "on",
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
