"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { slugify } from "@/lib/slug";
import { parseGameUrl } from "@/lib/hosted-access";
import { removeStorageFolder } from "@/lib/storage-folder";
import { logAdmin } from "@/lib/admin-audit";

const BUCKET = "games";
const COVER_BUCKET = "product-covers";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COVER_PATH_RE = /^[0-9a-f-]{36}\.[a-z0-9]{1,5}$/;

async function assertAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Không có quyền admin.");
  return admin;
}

export interface UploadToken {
  path: string; // đường dẫn tương đối trong game (vd index.html, assets/x.mp3)
  token: string;
}

/** Tạo signed upload URL cho từng file của bản build. Browser upload thẳng lên Storage (bucket private). */
export async function createGameUploadTokens(
  paths: string[]
): Promise<{ gameId: string; tokens: UploadToken[] }> {
  await assertAdmin();
  if (!paths.includes("index.html")) {
    throw new Error("Zip phải chứa index.html ở gốc bản build.");
  }
  if (paths.some((p) => p.split("/").includes(".."))) throw new Error("Đường dẫn file không hợp lệ.");
  const supabase = createStoreAdminClient();
  const gameId = crypto.randomUUID();

  const tokens: UploadToken[] = [];
  for (const p of paths) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(`${gameId}/${p}`);
    if (error || !data) throw new Error(`Lỗi tạo link upload cho ${p}: ${error?.message}`);
    tokens.push({ path: p, token: data.token });
  }
  return { gameId, tokens };
}

/** Bản build đã lên đủ (có index.html) chưa. */
async function assertBuildUploaded(gameId: string) {
  if (!UUID_RE.test(gameId)) throw new Error("Mã bản build không hợp lệ.");
  const { data } = await createStoreAdminClient()
    .storage.from(BUCKET)
    .list(gameId, { search: "index.html", limit: 10 });
  if (!data?.some((f) => f.name === "index.html")) throw new Error("Bản build chưa tải lên đủ (thiếu index.html).");
}

export interface SaveGameInput {
  gameId: string;
  title: string;
  categoryId: string;
  publisherId: string;
  tier: "free" | "pro";
  priceMonth: number;
  giaolyProFree?: boolean;
  description?: string;
  /** Đường dẫn ảnh bìa đã tải lên bucket product-covers (createProductUpload); trống nếu không có. */
  coverPath?: string;
  kind?: "game" | "tool"; // 'tool' = web app host nội bộ, mở tự do (thu tiền qua Ví Ephata)
}

/** Tạo sản phẩm game / công cụ web sau khi đã upload xong bản build. */
export async function saveGameProduct(input: SaveGameInput): Promise<{ slug: string }> {
  const admin = await assertAdmin();
  await assertBuildUploaded(input.gameId);
  const supabase = createStoreAdminClient();

  const [{ data: cat }, { data: pub }] = await Promise.all([
    supabase.from("categories").select("id").eq("id", input.categoryId).maybeSingle(),
    supabase.from("publishers").select("id").eq("id", input.publisherId).maybeSingle(),
  ]);
  if (!cat) throw new Error("Chưa chọn danh mục.");
  if (!pub) throw new Error("Chưa chọn nhà phát hành.");

  // Phục vụ qua route /g kèm mã truy cập (bucket private). Xem app/g/[gameId]/[...path].
  const gameUrl = `/g/${input.gameId}/index.html`;

  if (input.coverPath && !COVER_PATH_RE.test(input.coverPath)) throw new Error("Ảnh bìa không hợp lệ.");
  const coverUrl = input.coverPath
    ? supabase.storage.from(COVER_BUCKET).getPublicUrl(input.coverPath).data.publicUrl
    : null;

  const isTool = input.kind === "tool";
  const baseSlug = slugify(input.title) || (isTool ? "cong-cu" : "game");
  const slug = `${baseSlug}-${input.gameId.slice(0, 6)}`;
  // Công cụ web: mở tự do (tier free); Game: theo tier chọn.
  const tier = isTool ? "free" : input.tier === "pro" ? "pro" : "free";
  const price = tier === "pro" ? Math.max(0, input.priceMonth) : 0;
  const desc = input.description?.trim() || input.title;

  const { error } = await supabase.from("products").insert({
    slug,
    title: input.title,
    tagline: desc.slice(0, 140),
    description: desc,
    type: isTool ? "tool" : "game",
    category_id: cat.id,
    publisher_id: pub.id,
    tier,
    min_plan: tier,
    price_month: price,
    price_vnd: price,
    giaoly_pro_free: tier === "pro" && !!input.giaolyProFree,
    trial: false,
    trial_days: 7,
    active: true,
    published: true,
    icon: isTool ? "🛠" : "◈",
    game_url: gameUrl,
    cover_url: coverUrl,
    is_new: true,
    released_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  // gắn danh mục nhiều-nhiều
  const { data: prod } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (prod) {
    await supabase
      .from("product_categories")
      .upsert({ product_id: prod.id, category_id: cat.id }, { ignoreDuplicates: true });
    await logAdmin(admin, "product.create", { type: "product", id: prod.id }, { slug, title: input.title, type: isTool ? "tool" : "game", build: input.gameId });
  }

  revalidatePath("/admin");
  return { slug };
}

/**
 * Thay bản build của game / công cụ web đã đăng — TẠI CHỖ: cùng sản phẩm, cùng slug, người đã mua giữ quyền.
 * Bản đang chạy chuyển thành "bản trước" (quay lại được bằng rollbackHostedBuild); chỉ bản cũ hơn nữa bị xóa.
 */
export async function replaceHostedBuild(productId: string, newGameId: string): Promise<void> {
  const admin = await assertAdmin();
  await assertBuildUploaded(newGameId);
  const supabase = createStoreAdminClient();

  const { data: prod } = await supabase
    .from("products")
    .select("id,game_url,game_url_prev")
    .eq("id", productId)
    .maybeSingle();
  const old = parseGameUrl(prod?.game_url);
  if (!prod || !old) throw new Error("Sản phẩm không phải game / công cụ host trên store.");
  if (old.gameId === newGameId) return;

  const { error } = await supabase
    .from("products")
    .update({ game_url: `/g/${newGameId}/index.html`, game_url_prev: prod.game_url })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  // Bản trước nữa không còn quay lại được → xóa.
  const older = parseGameUrl(prod.game_url_prev);
  if (older && older.gameId !== old.gameId && older.gameId !== newGameId)
    await removeStorageFolder(supabase, BUCKET, older.gameId);
  await logAdmin(admin, "build.replace", { type: "product", id: productId }, {
    from: old.gameId,
    to: newGameId,
    removed: older?.gameId ?? null,
  });
  revalidatePath(`/admin/products/${productId}/edit`);
}

/** Quay lại bản build trước (đổi chỗ bản đang chạy ↔ bản trước — bấm lần nữa là quay về bản vừa thay). */
export async function rollbackHostedBuild(productId: string): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createStoreAdminClient();
  const { data: prod } = await supabase
    .from("products")
    .select("id,game_url,game_url_prev")
    .eq("id", productId)
    .maybeSingle();
  const cur = parseGameUrl(prod?.game_url);
  const prev = parseGameUrl(prod?.game_url_prev);
  if (!prod || !cur || !prev) throw new Error("Không có bản build trước để quay lại.");
  await assertBuildUploaded(prev.gameId);

  const { error } = await supabase
    .from("products")
    .update({ game_url: prod.game_url_prev, game_url_prev: prod.game_url })
    .eq("id", productId)
    .eq("game_url", prod.game_url); // chống 2 người bấm cùng lúc
  if (error) throw new Error(error.message);
  await logAdmin(admin, "build.rollback", { type: "product", id: productId }, { from: cur.gameId, to: prev.gameId });
  revalidatePath(`/admin/products/${productId}/edit`);
}
