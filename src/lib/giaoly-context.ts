/**
 * Ngữ cảnh giaoly của user (giáo xứ, vai trò, gói).
 *
 * PHASE 1: danh tính gốc là tài khoản STORE, chưa có liên kết giaoly → luôn null
 * (mọi user coi như chưa gắn giaoly, plan = free).
 * PHASE 2 sẽ đọc từ liên kết đã lưu (profiles.giaoly_user_id + cache context).
 */
export interface GiaolyContext {
  parishId: string | null;
  role: string | null;
  planRaw: string | null;
}

export async function getGiaolyContext(): Promise<GiaolyContext | null> {
  return null;
}

/** true nếu user là admin giáo xứ (Phase 2). */
export async function isParishAdmin(): Promise<boolean> {
  const ctx = await getGiaolyContext();
  return ctx?.role === "admin" && !!ctx.parishId;
}
