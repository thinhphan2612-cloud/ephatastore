"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { parseGameUrl } from "@/lib/hosted-access";
import { GAMES_BUCKET as BUCKET, assertBuildUploaded } from "@/lib/hosted-build";
import { removeStorageFolder } from "@/lib/storage-folder";
import { logAdmin } from "@/lib/admin-audit";
import { attempt, type ActionResult } from "@/lib/action-result";

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
): Promise<ActionResult<{ gameId: string; tokens: UploadToken[] }>> {
  return attempt(async () => {
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
  });
}

/**
 * Thay bản build của game / công cụ web đã đăng — TẠI CHỖ: cùng sản phẩm, cùng slug, người đã mua giữ quyền.
 * Bản đang chạy chuyển thành "bản trước" (quay lại được bằng rollbackHostedBuild); chỉ bản cũ hơn nữa bị xóa.
 */
export async function replaceHostedBuild(productId: string, newGameId: string): Promise<ActionResult<void>> {
  return attempt(async () => {
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
  });
}

/** Quay lại bản build trước (đổi chỗ bản đang chạy ↔ bản trước — bấm lần nữa là quay về bản vừa thay). */
export async function rollbackHostedBuild(productId: string): Promise<ActionResult<void>> {
  return attempt(async () => {
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
  });
}
