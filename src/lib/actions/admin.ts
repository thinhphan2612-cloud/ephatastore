"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, logAdmin } from "@/lib/admin-audit";
import { deleteBlockReason, getProductUsage, slugLockReason } from "@/data/product-usage";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { slugify } from "@/lib/slug";
import { htmlToText, sanitizeDescription } from "@/lib/rich-text";
import { removeStorageFolder } from "@/lib/storage-folder";
import { retryProvisionJob, syncParishFeature } from "@/lib/giaoly-provision";
import { attempt, type ActionResult } from "@/lib/action-result";
import { IMAGE_EXT, VIDEO_EXT, MAX_GALLERY, youtubeId, type GalleryItem } from "@/lib/gallery";

const assertAdmin = requireAdmin;

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
  purpose: "cover" | "download" | "logo" | "media";
  fileName: string;
}): Promise<ActionResult<{ bucket: string; path: string; token: string }>> {
  return attempt(async () => {
    await assertAdmin();
    const supabase = createStoreAdminClient();
    const ext = (input.fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    // Logo: ảnh (bucket ảnh bìa). Media: ảnh / video minh họa (bucket product-media, 0026).
    if (input.purpose === "logo" && !["png", "jpg", "jpeg", "webp"].includes(ext))
      throw new Error("Logo phải là ảnh PNG / JPG / WebP.");
    if (input.purpose === "media" && ![...IMAGE_EXT, ...VIDEO_EXT].includes(ext))
      throw new Error("Ảnh minh họa: PNG / JPG / WebP / GIF; video: MP4 / WebM.");
    const bucket =
      input.purpose === "download" ? FILES_BUCKET : input.purpose === "media" ? MEDIA_BUCKET : COVER_BUCKET;
    const path =
      input.purpose === "download"
        ? `${crypto.randomUUID()}/${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        : `${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Lỗi tạo link upload: ${error?.message}`);
    return { bucket, path, token: data.token };
  });
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const COVER_PATH_RE = new RegExp(`^${UUID}\\.[a-z0-9]{1,5}$`);
const DOWNLOAD_PATH_RE = new RegExp(`^${UUID}/[A-Za-z0-9._-]+$`);
const MEDIA_BUCKET = "product-media";

/**
 * Ảnh / video minh họa gửi từ form (gallery_json): tối đa 4 mục; file phải nằm trong bucket product-media của store,
 * YouTube phải là mã hợp lệ. Trả danh sách đã chuẩn hóa hoặc lỗi.
 */
function parseGalleryInput(raw: string, mediaBase: string): GalleryItem[] | { error: string } {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    return { error: "Dữ liệu ảnh minh họa không hợp lệ." };
  }
  if (!Array.isArray(arr)) return { error: "Dữ liệu ảnh minh họa không hợp lệ." };
  if (arr.length > MAX_GALLERY) return { error: `Tối đa ${MAX_GALLERY} ảnh / video minh họa.` };
  const out: GalleryItem[] = [];
  for (const it of arr as Record<string, unknown>[]) {
    if (it?.type === "youtube") {
      const id = typeof it.id === "string" ? youtubeId(it.id) : null;
      if (!id) return { error: "Link YouTube không hợp lệ." };
      out.push({ type: "youtube", id });
    } else if ((it?.type === "image" || it?.type === "video") && typeof it.url === "string" && it.url.startsWith(mediaBase)) {
      out.push({ type: it.type, url: it.url });
    } else return { error: "Ảnh / video minh họa phải tải lên qua form (không dán link ngoài)." };
  }
  return out;
}

/** Đường dẫn trong bucket product-covers từ public URL (null nếu ảnh không nằm ở bucket này). */
function coverPathFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/product-covers\/(.+)$/);
  return m ? m[1] : null;
}

const MAX_PRICE_VND = 100_000_000;
const PRODUCT_TYPES = ["tool", "game", "asset", "image", "feature", "software"];
const FEATURE_KEY_RE = /^[a-z0-9_]{3,50}$/;

/** URL https hợp lệ (app ngoài) — trước đây gõ thiếu https:// làm trang /launch của khách đã trả tiền bị lỗi. */
function isHttpsUrl(v: unknown): boolean {
  if (typeof v !== "string" || !v) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/** Loại bán MỘT LẦN dùng vĩnh viễn; còn lại (tool/feature) là thuê bao. */
const PERPETUAL_TYPES = ["asset", "image", "game", "software"];

function optionalText(formData: FormData, key: string): Record<string, string | null> {
  return formData.has(key) ? { [key]: String(formData.get(key) ?? "").trim() || null } : {};
}

function parseProduct(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const originalPrice = String(formData.get("original_price_vnd") ?? "").trim();
  const releasedAt = String(formData.get("released_at") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Mô tả chi tiết: HTML đã lọc (lib/rich-text) + bản text thuần rút ra cho trang chủ / meta / tìm kiếm.
  const descriptionHtml = sanitizeDescription(String(formData.get("description_html") ?? ""));

  return {
    title,
    slug: slugInput ? slugify(slugInput) : slugify(title),
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: htmlToText(descriptionHtml),
    description_html: descriptionHtml || null,
    type: String(formData.get("type") ?? "tool"),
    category_id: String(formData.get("category_id") ?? ""),
    publisher_id: String(formData.get("publisher_id") ?? ""),
    original_price_vnd: originalPrice ? Number(originalPrice) : null,
    tags,
    released_at: releasedAt || null,
    // Chỉ ghi các ô giao hàng mà form có hiển thị — form theo loại không có ô thì giữ nguyên giá trị cũ.
    ...optionalText(formData, "game_url"),
    ...optionalText(formData, "app_url"),
    ...optionalText(formData, "giaoly_feature_key"),
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
  if (price > MAX_PRICE_VND) return { error: `Giá tối đa ${MAX_PRICE_VND.toLocaleString("vi-VN")}đ — kiểm tra lại số 0.` };
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

/** Xem trước mô tả HTML trong form — trả đúng HTML sau khi lọc (như sẽ hiện trên trang sản phẩm). */
export async function previewDescription(html: string): Promise<string> {
  await assertAdmin();
  return sanitizeDescription(String(html ?? ""));
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
  const admin = await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const row = parseProduct(formData);

  if (!row.title) return { error: "Thiếu tiêu đề." };
  if (!row.slug) return { error: "Không tạo được slug từ tiêu đề — nhập slug (chữ không dấu, số, gạch ngang)." };
  if (!PRODUCT_TYPES.includes(row.type)) return { error: "Loại sản phẩm không hợp lệ." };
  if (!row.category_id) return { error: "Chưa chọn danh mục." };
  if (!row.publisher_id) return { error: "Chưa chọn nhà phát hành." };
  const rawDesc = String(formData.get("description_html") ?? "");
  if (rawDesc.length > 100_000)
    return { error: `Mô tả HTML dài ${rawDesc.length.toLocaleString("vi-VN")} ký tự — tối đa 100.000 (bớt ảnh base64 / CSS thừa).` };

  const pricing = parsePricing(formData, row.type);
  if ("error" in pricing) return { error: String(pricing.error) };

  const supabase = createStoreAdminClient();
  const payload: Record<string, unknown> = { ...row, ...pricing };
  if (formData.has("active_field")) payload.active = formData.get("active") === "on";

  // Bản hiện tại (khi sửa) — để kiểm khóa loại / feature key, ràng buộc theo loại, dọn file cũ, nhật ký.
  const { data: before } = id
    ? await supabase
        .from("products")
        .select(
          "category_id,cover_url,download_path,slug,title,type,tier,price_month,published,active,giaoly_pro_free,giaoly_feature_key,app_url,game_url,uses_wallet,ms_store_url,updated_at"
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (id && !before) return { error: "Sản phẩm không tồn tại (có thể đã bị xóa)." };

  // Hai admin cùng sửa: form mở từ trước (updated_at cũ) không được ghi đè thay đổi mới hơn.
  const openedAt = String(formData.get("updated_at") ?? "");
  if (before && openedAt && before.updated_at && openedAt !== before.updated_at)
    return { error: "Sản phẩm vừa được người khác sửa sau khi bạn mở form. Tải lại trang (F5) rồi sửa lại — tránh ghi đè thay đổi của họ." };

  // Đã có người dùng → không đổi loại / feature key (đổi loại làm sai giá & cách giao hàng; đổi key làm GLS mất đồng bộ).
  const merged = { ...(before ?? {}), ...payload } as Record<string, unknown>;
  if (before && (before.type !== row.type || (before.giaoly_feature_key ?? null) !== (merged.giaoly_feature_key ?? null))) {
    const locked = slugLockReason(await getProductUsage(id));
    if (locked && before.type !== row.type)
      return { error: `Không đổi được loại sản phẩm — đã có ${locked}. Muốn bán loại khác, hãy tạo sản phẩm mới.` };
    if (locked && before.giaoly_feature_key !== merged.giaoly_feature_key)
      return { error: `Không đổi được feature key — đã có ${locked}. Key giữ nguyên "${before.giaoly_feature_key ?? ""}".` };
  }

  // Ràng buộc theo loại — không để bán sản phẩm không giao được.
  const hostedApp = !!merged.game_url;
  if (row.type === "feature" && !FEATURE_KEY_RE.test(String(merged.giaoly_feature_key ?? "")))
    return { error: "Tính năng Giáo Lý Số cần Feature key: 3–50 ký tự a–z, 0–9, gạch dưới (vd diem_danh_qr) — thống nhất với Giáo Lý Số." };
  if (row.type === "tool" && !hostedApp && !isHttpsUrl(merged.app_url))
    return { error: "Link ngoài cần URL app bắt đầu bằng https:// (vd https://app.example.com)." };
  if (row.type === "tool" && hostedApp && payload.tier === "pro")
    return { error: "Công cụ chạy trên store luôn miễn phí (thu tiền theo lượt qua Ví Ephata) — chọn Miễn phí." };
  // Ô "App trừ point qua Ví Ephata" chỉ có ở form của loại app (đánh dấu bằng uses_wallet_field).
  if (formData.has("uses_wallet_field")) payload.uses_wallet = formData.get("uses_wallet") === "on";

  // File đã được trình duyệt tải thẳng lên Storage (createProductUpload) → chỉ nhận đường dẫn.
  const coverPath = String(formData.get("cover_path") ?? "").trim();
  if (coverPath) {
    if (!COVER_PATH_RE.test(coverPath)) return { error: "Đường dẫn ảnh bìa không hợp lệ." };
    payload.cover_url = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath).data.publicUrl;
  }
  // Logo ứng dụng (bucket ảnh bìa) — logo_remove = bỏ logo, về icon mặc định.
  const logoPath = String(formData.get("logo_path") ?? "").trim();
  if (logoPath) {
    if (!COVER_PATH_RE.test(logoPath)) return { error: "Đường dẫn logo không hợp lệ." };
    payload.logo_url = supabase.storage.from(COVER_BUCKET).getPublicUrl(logoPath).data.publicUrl;
  } else if (formData.get("logo_remove") === "1") payload.logo_url = null;
  // Ảnh / video minh họa (tối đa 4).
  if (formData.has("gallery_json")) {
    const mediaBase = supabase.storage.from(MEDIA_BUCKET).getPublicUrl("x").data.publicUrl.replace(/x$/, "");
    const g = parseGalleryInput(String(formData.get("gallery_json") ?? ""), mediaBase);
    if (!Array.isArray(g)) return { error: g.error };
    payload.gallery = g;
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

  // Đang bán mà chưa có thứ để giao → chặn.
  if (row.published) {
    if ((row.type === "asset" || row.type === "image") && !(payload.download_path ?? before?.download_path))
      return { error: "Chưa có file tải về — tải file lên trước, hoặc bỏ tick “Đang bán”." };
    if (row.type === "software" && !payload.ms_store_url) {
      const { count } = id
        ? await supabase.from("software_releases").select("id", { count: "exact", head: true }).eq("product_id", id)
        : { count: 0 };
      const addingInstaller = formData.get("has_installer") === "1";
      if (!count && !addingInstaller)
        return { error: "Phần mềm chưa có bộ cài nào và chưa có link Microsoft Store — thêm bộ cài, hoặc bỏ tick “Đang bán”." };
    }
  }
  payload.updated_at = new Date().toISOString();

  // Slug khóa khi sản phẩm đã có người dùng / đã phát hành phần mềm (link, API phần mềm, Giáo Lý Số dựa vào slug).
  if (before && before.slug !== row.slug) {
    const locked = slugLockReason(await getProductUsage(id));
    if (locked) return { error: `Không đổi được slug — sản phẩm đã có ${locked}. Slug giữ nguyên "${before.slug}".` };
  }

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

  // Nhật ký: tạo mới, hoặc các trường quan trọng đã đổi.
  const after: Record<string, unknown> = {
    slug: row.slug,
    title: row.title,
    type: row.type,
    tier: payload.tier,
    price_month: payload.price_month,
    published: row.published,
    active: merged.active,
    giaoly_pro_free: payload.giaoly_pro_free,
    giaoly_feature_key: merged.giaoly_feature_key ?? null,
    app_url: merged.app_url ?? null,
    download_path: merged.download_path ?? null,
    uses_wallet: merged.uses_wallet,
    ms_store_url: merged.ms_store_url ?? null,
  };
  const changed = before
    ? Object.fromEntries(
        Object.entries(after)
          .filter(([k, v]) => (before as Record<string, unknown>)[k] !== v)
          .map(([k, v]) => [k, { from: (before as Record<string, unknown>)[k], to: v }])
      )
    : after;
  await logAdmin(admin, before ? "product.update" : "product.create", { type: "product", id: saved.id }, changed);

  return { id: saved.id };
}

const GAMES_BUCKET = "games";

export async function deleteProduct(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();

  // Lấy thông tin để dọn Storage sau khi xóa row.
  const { data: prod } = await supabase
    .from("products")
    .select("type,game_url,game_url_prev,download_path,slug,title")
    .eq("id", id)
    .maybeSingle();

  // Đã có người dùng → không xóa cứng (DB cũng chặn bằng ON DELETE RESTRICT, migration 0020).
  const blocked = deleteBlockReason(await getProductUsage(id));
  if (blocked) {
    const msg = `Không xóa được "${prod?.title ?? id}" — đã có ${blocked}. Bỏ tích "Hiện" để ẩn khỏi store.`;
    redirect(`/admin?notice=${encodeURIComponent(msg)}`);
  }

  // Xóa row. Phòng khi có người dùng phát sinh ngay lúc này: DB RESTRICT chặn (23503) → báo như trên.
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503")
      redirect(`/admin?notice=${encodeURIComponent(`Không xóa được "${prod?.title ?? id}" — sản phẩm đã có người dùng. Bỏ tích "Hiện" để ẩn khỏi store.`)}`);
    throw new Error(error.message);
  }

  await logAdmin(admin, "product.delete", { type: "product", id }, { slug: prod?.slug, title: prod?.title });

  // Dọn Storage (best-effort): thư mục game/tool host (bản hiện tại + bản trước) + file tải về.
  for (const url of [prod?.game_url, prod?.game_url_prev]) {
    const gameId = url?.match(/^\/g\/([^/]+)\//)?.[1];
    if (gameId) await removeStorageFolder(supabase, GAMES_BUCKET, gameId);
  }
  if (prod?.download_path)
    await supabase.storage.from(FILES_BUCKET).remove([prod.download_path]);
  // Bộ cài phần mềm (software_releases cascade theo row).
  if (prod?.type === "software")
    await removeStorageFolder(supabase, FILES_BUCKET, `software/${id}`);

  revalidatePath("/admin");
  redirect("/admin");
}

// ---- Quyền sở hữu của user ----

/** Loại sản phẩm + giáo xứ của user (tính năng Giáo Lý Số cấp / thu hồi theo giáo xứ). */
async function grantTarget(userId: string, productId: string) {
  const supabase = createStoreAdminClient();
  const [{ data: product }, { data: prof }] = await Promise.all([
    supabase.from("products").select("type,giaoly_feature_key").eq("id", productId).maybeSingle(),
    supabase.from("profiles").select("parish_id").eq("id", userId).maybeSingle(),
  ]);
  return { product, parishId: (prof?.parish_id as string | null) ?? null };
}

/**
 * Cấp một sản phẩm cho user (thủ công). Tính năng Giáo Lý Số → cấp cho GIÁO XỨ của user (vĩnh viễn, đến khi thu hồi).
 * Phần mềm → mở lại key nếu key đã bị khóa do thu hồi trước đó.
 */
export async function grantEntitlement(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!userId || !productId) return;

  const supabase = createStoreAdminClient();
  const { product, parishId } = await grantTarget(userId, productId);
  if (product?.giaoly_feature_key) {
    if (!parishId) redirect(`/admin/users/${userId}?notice=${encodeURIComponent("Người dùng chưa liên kết Giáo Lý Số — không cấp được tính năng cho giáo xứ.")}`);
    const { error } = await supabase
      .from("parish_entitlements")
      .upsert(
        { parish_id: parishId, product_id: productId, source: "admin", expires_at: null, purchased_by: userId, updated_at: new Date().toISOString() },
        { onConflict: "parish_id,product_id" }
      );
    if (error) throw new Error(error.message);
    await syncParishFeature(parishId, productId, userId).catch((e) => console.error("provision", e));
    await logAdmin(admin, "entitlement.grant", { type: "user", id: userId }, { product_id: productId, parish_id: parishId });
    revalidatePath(`/admin/users/${userId}`);
    return;
  }

  const { error } = await supabase
    .from("entitlements")
    .upsert(
      { store_user_id: userId, product_id: productId },
      { onConflict: "store_user_id,product_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
  if (product?.type === "software")
    await supabase.from("licenses").update({ status: "active" }).eq("store_user_id", userId).eq("product_id", productId);
  await logAdmin(admin, "entitlement.grant", { type: "user", id: userId }, { product_id: productId });

  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Thu hồi một sản phẩm khỏi user. Tính năng Giáo Lý Số → thu hồi của GIÁO XỨ (giữ dòng, hạn = bây giờ → còn lịch sử dùng thử)
 * + gửi lệnh tắt sang Giáo Lý Số. Phần mềm → KHÓA key (app báo key bị thu hồi ở lần kiểm tiếp theo).
 */
export async function revokeEntitlement(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const parishFromForm = String(formData.get("parish_id") ?? "").trim();
  if (!userId || !productId) return;

  const detail = await revokeProductAccess(userId, productId, parishFromForm || null);
  await logAdmin(admin, "entitlement.revoke", { type: "user", id: userId }, { product_id: productId, ...detail });
  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Tắt quyền dùng một sản phẩm của user (dùng chung cho "Thu hồi" và "Hoàn tiền + thu hồi").
 * Tính năng GLS → quyền của giáo xứ (hạn = bây giờ) + gửi lệnh tắt; phần mềm → xóa quyền + khóa key; còn lại → xóa quyền.
 * productId = "topping" → cắt Full Topping đang còn hạn.
 */
async function revokeProductAccess(userId: string, productId: string, parishOverride: string | null): Promise<Record<string, unknown>> {
  const supabase = createStoreAdminClient();
  const now = new Date().toISOString();
  if (productId === "topping") {
    const { error } = await supabase
      .from("subscriptions")
      .update({ expires_at: now })
      .eq("store_user_id", userId)
      .eq("kind", "topping")
      .gt("expires_at", now);
    if (error) throw new Error(error.message);
    return { topping: true };
  }
  const { product, parishId: userParish } = await grantTarget(userId, productId);
  const parishId = parishOverride || userParish;
  if (product?.giaoly_feature_key) {
    if (!parishId) return { skipped: "user không còn giáo xứ — thu hồi ở trang của quản trị khác cùng giáo xứ" };
    const { error } = await supabase
      .from("parish_entitlements")
      .update({ expires_at: now, updated_at: now })
      .eq("parish_id", parishId)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
    await syncParishFeature(parishId, productId, userId).catch((e) => console.error("provision", e));
    return { parish_id: parishId };
  }
  const { error } = await supabase.from("entitlements").delete().eq("store_user_id", userId).eq("product_id", productId);
  if (error) throw new Error(error.message);
  if (product?.type === "software")
    await supabase.from("licenses").update({ status: "revoked" }).eq("store_user_id", userId).eq("product_id", productId);
  return {};
}

// ---- Hỗ trợ khách: điều chỉnh / hoàn point ----

const USER_NOTICE = (userId: string, m: string): never => redirect(`/admin/users/${userId}?notice=${encodeURIComponent(m)}`);

/** Admin cộng / trừ point cho khách (vd chuyển khoản không khớp đơn, bù lỗi). Bắt buộc lý do — hiện trong lịch sử Ví của khách. */
export async function adjustUserPoints(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const amount = Math.trunc(Number(formData.get("amount") ?? 0) || 0);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!userId) return;
  if (!amount || Math.abs(amount) > 1_000_000) USER_NOTICE(userId, "Số point phải khác 0 và tối đa ±1.000.000.");
  if (reason.length < 5) USER_NOTICE(userId, "Ghi lý do (ít nhất 5 ký tự) — khách thấy lý do này trong lịch sử Ví.");

  const { data: balance, error } = await createStoreAdminClient().rpc("adjust_points", {
    p_user: userId,
    p_amount: amount,
    p_kind: "adjust",
    p_ref: "admin",
    p_note: reason,
  });
  if (error) USER_NOTICE(userId, /INSUFFICIENT_POINTS/.test(error.message) ? "Số dư không đủ để trừ." : `Không điều chỉnh được: ${error.message}`);
  await logAdmin(admin, "wallet.adjust", { type: "user", id: userId }, { amount, reason, balance });
  revalidatePath(`/admin/users/${userId}`);
  USER_NOTICE(userId, `Đã ${amount > 0 ? "cộng" : "trừ"} ${Math.abs(amount).toLocaleString("vi-VN")} point. Số dư mới: ${Number(balance).toLocaleString("vi-VN")}.`);
}

/**
 * Hoàn point cho MỘT lượt trừ (mua sản phẩm / Full Topping / key phần mềm) — mỗi lượt hoàn 1 lần (admin_refund_spend, 0025).
 * Ô "Thu hồi quyền dùng" (admin chọn): tắt quyền sản phẩm đó của khách (toàn bộ, không chỉ phần của lượt này).
 */
export async function refundSpend(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const ledgerId = String(formData.get("ledger_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const revoke = formData.get("revoke") === "on";
  if (!userId || !ledgerId) return;
  if (reason.length < 5) USER_NOTICE(userId, "Ghi lý do hoàn (ít nhất 5 ký tự).");

  const supabase = createStoreAdminClient();
  const { data: row } = await supabase.from("point_ledger").select("user_id,ref,amount").eq("id", ledgerId).maybeSingle();
  if (!row || row.user_id !== userId) USER_NOTICE(userId, "Không tìm thấy lượt trừ point này của khách.");

  const { data: balance, error } = await supabase.rpc("admin_refund_spend", { p_ledger: ledgerId, p_note: reason });
  if (error) {
    const m = /ALREADY_REFUNDED/.test(error.message)
      ? "Lượt này đã được hoàn trước đó."
      : /NOT_REFUNDABLE/.test(error.message)
        ? "Lượt này không hoàn ở đây được (lượt trừ của app qua Ví — app tự hoàn)."
        : `Không hoàn được: ${error.message}`;
    USER_NOTICE(userId, m);
  }

  let revoked: Record<string, unknown> | null = null;
  const productRef = row!.ref ?? "";
  if (revoke && (productRef === "topping" || /^[0-9a-f-]{36}$/.test(productRef)))
    revoked = await revokeProductAccess(userId, productRef, null);

  await logAdmin(admin, "wallet.refund", { type: "user", id: userId }, {
    ledger_id: ledgerId,
    points: -row!.amount,
    ref: productRef,
    reason,
    revoked: revoke ? (revoked ?? { skipped: "không xác định được sản phẩm" }) : false,
  });
  revalidatePath(`/admin/users/${userId}`);
  USER_NOTICE(
    userId,
    `Đã hoàn ${(-row!.amount).toLocaleString("vi-VN")} point (số dư mới ${Number(balance).toLocaleString("vi-VN")})${revoke ? " và thu hồi quyền dùng" : ", khách vẫn giữ quyền dùng"}.`
  );
}

// ---- Cấu hình nhanh sản phẩm (tier / giá / trial / active) ----
export async function updateProductConfig(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { data: cur } = await supabase.from("products").select("type,game_url").eq("id", id).maybeSingle();
  if (!cur) return;
  const notice = (m: string): never => redirect(`/admin?notice=${encodeURIComponent(m)}`);
  const tier = formData.get("tier") === "pro" ? "pro" : "free";
  if (tier === "pro" && cur.type === "tool" && cur.game_url)
    notice("Công cụ chạy trên store luôn miễn phí (thu tiền theo lượt qua Ví Ephata) — không đặt PRO.");
  // Giá: số nguyên 0 – 100 triệu (trước đây giá âm làm DB từ chối → trang lỗi).
  const priceMonth = tier === "pro" ? Math.min(100_000_000, Math.max(0, Math.floor(Number(formData.get("price_month") ?? 0) || 0))) : 0;
  const patch = {
    tier,
    min_plan: tier,
    price_month: priceMonth,
    price_vnd: priceMonth,
    // Dùng thử chỉ cho loại thuê bao (công cụ / tính năng); loại mua vĩnh viễn không có dùng thử.
    trial: tier === "pro" && !PERPETUAL_TYPES.includes(cur.type) && formData.get("trial") === "on",
    trial_days: Math.min(60, Math.max(1, Math.floor(Number(formData.get("trial_days") ?? 7) || 7))),
    active: formData.get("active") === "on",
    giaoly_pro_free: tier === "pro" && formData.get("giaoly_pro_free") === "on",
    updated_at: new Date().toISOString(),
  };
  if (tier === "pro" && priceMonth <= 0) notice("Sản phẩm PRO cần giá lớn hơn 0 — hoặc chọn FREE.");

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(admin, "product.config", { type: "product", id }, patch);

  revalidatePath("/admin");
}

// ---- Coupon ----
export async function createCoupon(formData: FormData) {
  const admin = await assertAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
  const kind = formData.get("kind") === "amount" ? "amount" : "percent";
  const value = Math.floor(Number(formData.get("value") ?? 0) || 0);
  if (!code || value <= 0 || (kind === "percent" && value > 100)) return;
  // Hạn dùng: hết ngày đã chọn theo giờ Việt Nam. Số lượt tối đa: để trống = không giới hạn.
  const expiresDate = String(formData.get("expires_at") ?? "").trim();
  const expires_at = /^\d{4}-\d{2}-\d{2}$/.test(expiresDate) ? new Date(`${expiresDate}T23:59:59+07:00`).toISOString() : null;
  const maxUses = Math.floor(Number(formData.get("max_uses") ?? 0) || 0);
  const max_uses = maxUses > 0 ? maxUses : null;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("discount_codes")
    .insert({ code, kind, value, active: true, expires_at, max_uses });
  if (error && error.code !== "23505") throw new Error(error.message);
  if (!error) await logAdmin(admin, "coupon.create", { type: "coupon", id: code }, { kind, value, expires_at, max_uses });

  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("next") === "true";
  const supabase = createStoreAdminClient();
  await supabase.from("discount_codes").update({ active: next }).eq("id", id);
  await logAdmin(admin, "coupon.toggle", { type: "coupon", id }, { active: next });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const supabase = createStoreAdminClient();
  await supabase.from("discount_codes").delete().eq("id", id);
  await logAdmin(admin, "coupon.delete", { type: "coupon", id });
  revalidatePath("/admin/coupons");
}

// ---- Cài đặt / chính sách ----
export async function saveSettings(formData: FormData) {
  const admin = await assertAdmin();
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
  await logAdmin(admin, "settings.save", { type: "settings" }, { fullToppingPrice, freedomDays, accessMode });

  revalidatePath("/admin/settings");
}

export async function togglePublish(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ published: next })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(admin, "product.publish", { type: "product", id }, { published: next });

  revalidatePath("/admin");
}

// ---- Đồng bộ Giáo Lý Số ----
export async function retryProvision(formData: FormData) {
  const admin = await assertAdmin();
  const jobId = String(formData.get("id") ?? "");
  await retryProvisionJob(jobId);
  await logAdmin(admin, "provision.retry", { type: "provision", id: jobId });
  revalidatePath("/admin/provisions");
}
