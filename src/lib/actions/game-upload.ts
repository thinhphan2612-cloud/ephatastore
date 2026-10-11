"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { slugify } from "@/lib/slug";

const BUCKET = "games";

async function assertAdmin() {
  if (!(await getAdminUser())) throw new Error("Không có quyền admin.");
}

export interface UploadToken {
  path: string; // đường dẫn tương đối trong game (vd index.html, assets/x.mp3)
  token: string;
}

/** Tạo signed upload URL cho từng file của game. Browser upload thẳng lên Storage. */
export async function createGameUploadTokens(
  paths: string[]
): Promise<{ gameId: string; tokens: UploadToken[] }> {
  await assertAdmin();
  if (!paths.includes("index.html")) {
    throw new Error("Zip phải chứa index.html ở gốc game.");
  }
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

export interface SaveGameInput {
  gameId: string;
  title: string;
  categorySlug: string;
  tier: "free" | "pro";
  priceMonth: number;
  description?: string;
  coverPath?: string; // rel trong bucket, vd "__cover.png" (đã upload); trống nếu không có
  kind?: "game" | "tool"; // 'tool' = web app host nội bộ, mở tự do (không gate Pro)
}

/** Tạo sản phẩm game sau khi đã upload xong file. */
export async function saveGameProduct(input: SaveGameInput): Promise<{ slug: string }> {
  await assertAdmin();
  const supabase = createStoreAdminClient();

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", input.categorySlug)
    .maybeSingle();
  if (!cat) throw new Error("Danh mục không hợp lệ.");

  const { data: pub } = await supabase
    .from("publishers")
    .select("id")
    .eq("slug", "ephata")
    .maybeSingle();

  // Phục vụ qua route /g (sửa content-type HTML). Xem app/g/[gameId]/[...path].
  const gameUrl = `/g/${input.gameId}/index.html`;

  // Ảnh banner/thumbnail (nếu có) — bucket games là public, dùng thẳng public URL.
  const coverUrl = input.coverPath
    ? supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${input.gameId}/${input.coverPath}`).data.publicUrl
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
    publisher_id: pub?.id ?? null,
    tier,
    min_plan: tier,
    price_month: price,
    price_vnd: price,
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
  }

  revalidatePath("/admin");
  return { slug };
}
