import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Bucket private chứa bản build game / công cụ web (phục vụ qua /g/[gameId]/...). */
export const GAMES_BUCKET = "games";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Bản build đã lên đủ (có index.html) chưa — dùng ở server action trước khi trỏ sản phẩm vào bản build. */
export async function assertBuildUploaded(gameId: string) {
  if (!UUID_RE.test(gameId)) throw new Error("Mã bản build không hợp lệ.");
  const { data } = await createStoreAdminClient()
    .storage.from(GAMES_BUCKET)
    .list(gameId, { search: "index.html", limit: 10 });
  if (!data?.some((f) => f.name === "index.html")) throw new Error("Bản build chưa tải lên đủ (thiếu index.html).");
}
