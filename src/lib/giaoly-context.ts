import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/**
 * Ngữ cảnh Giáo Lý Số của user store đã liên kết: giáo xứ, vai trò, gói, hạn gói.
 * Lưu cache trong profiles; tự làm mới từ Giáo Lý Số (edge function provision, action user_contexts)
 * khi lần đồng bộ cuối cũ hơn REFRESH_MS. Giáo Lý Số không trả lời → dùng bản cũ (hạn gói vẫn được tôn trọng).
 * null nếu chưa liên kết.
 */
export interface GiaolyContext {
  giaolyUserId: string;
  parishId: string | null;
  role: string | null;
  planRaw: string | null;
  /** Hạn gói của giáo xứ (null = không hạn). Pro chỉ còn hiệu lực trước thời điểm này. */
  planExpiresAt: string | null;
}

const REFRESH_MS = 6 * 60 * 60 * 1000;

interface ProfileRow {
  giaoly_user_id: string | null;
  parish_id: string | null;
  role: string | null;
  plan: string | null;
  plan_expires_at: string | null;
  context_checked_at: string | null;
}

const toContext = (d: ProfileRow): GiaolyContext => ({
  giaolyUserId: d.giaoly_user_id!,
  parishId: d.parish_id ?? null,
  role: d.role ?? null,
  planRaw: d.plan ?? null,
  planExpiresAt: d.plan_expires_at ?? null,
});

/**
 * Hỏi Giáo Lý Số ngữ cảnh mới nhất của các user đã liên kết rồi cập nhật cache trong profiles.
 * Trả các thay đổi đã ghi theo userId (để người gọi dùng ngay, không đọc lại — trong lúc render, Next memoize
 * các GET fetch trùng nhau nên đọc lại sẽ nhận bản cũ).
 */
export async function refreshGiaolyContexts(userIds: string[]): Promise<Record<string, Partial<ProfileRow>>> {
  const supabase = createStoreAdminClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,giaoly_user_id")
    .in("id", userIds)
    .not("giaoly_user_id", "is", null);
  const patches: Record<string, Partial<ProfileRow>> = {};
  if (!profs?.length) return patches;

  const now = new Date().toISOString();
  const endpoint = process.env.GIAOLY_PROVISION_URL;
  const secret = process.env.GIAOLY_PROVISION_SECRET;
  let contexts: { giaoly_user_id: string; parish_id: string | null; role: string | null; plan: string | null; plan_expires_at: string | null }[] | null = null;
  if (endpoint && secret) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-provision-secret": secret },
        body: JSON.stringify({ action: "user_contexts", giaoly_user_ids: profs.map((p) => p.giaoly_user_id) }),
        signal: AbortSignal.timeout(4000),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok && Array.isArray(body.contexts)) contexts = body.contexts;
      else console.error("giaoly user_contexts", res.status, body?.error);
    } catch (e) {
      console.error("giaoly user_contexts", e);
    }
  }

  for (const p of profs) {
    // Không gọi được → chỉ đánh dấu đã thử (thử lại sau REFRESH_MS), giữ nguyên dữ liệu cũ.
    const c = contexts?.find((x) => x.giaoly_user_id === p.giaoly_user_id);
    const patch: Partial<ProfileRow> = !contexts
      ? { context_checked_at: now }
      : c
        ? { parish_id: c.parish_id, role: c.role, plan: c.plan, plan_expires_at: c.plan_expires_at, context_checked_at: now }
        : // Không còn tài khoản bên Giáo Lý Số → mất vai trò / gói (giữ liên kết để người dùng tự gỡ).
          { parish_id: null, role: null, plan: null, plan_expires_at: null, context_checked_at: now };
    await supabase.from("profiles").update(patch).eq("id", p.id);
    patches[p.id] = patch;
  }
  return patches;
}

/** Ngữ cảnh Giáo Lý Số của một user bất kỳ (dùng được không cần phiên — vd server app ngoài gọi sang). */
export async function getGiaolyContextFor(userId: string): Promise<GiaolyContext | null> {
  try {
    const { data } = await createStoreAdminClient()
      .from("profiles")
      .select("giaoly_user_id,parish_id,role,plan,plan_expires_at,context_checked_at")
      .eq("id", userId)
      .maybeSingle();
    let d = data as ProfileRow | null;
    if (!d?.giaoly_user_id) return null;
    const checked = d.context_checked_at ? new Date(d.context_checked_at).getTime() : 0;
    if (Date.now() - checked > REFRESH_MS) {
      d = { ...d, ...(await refreshGiaolyContexts([userId]))[userId] };
    }
    return toContext(d);
  } catch {
    return null;
  }
}

/** Ngữ cảnh của user đang đăng nhập (cache theo request). */
export const getGiaolyContext = cache(async (): Promise<GiaolyContext | null> => {
  const user = await getCurrentUser();
  return user ? getGiaolyContextFor(user.id) : null;
});

/** true nếu user đã liên kết giaoly và là admin giáo xứ (được mua tính năng). */
export async function isParishAdmin(): Promise<boolean> {
  const ctx = await getGiaolyContext();
  return ctx?.role === "admin" && !!ctx.parishId;
}
