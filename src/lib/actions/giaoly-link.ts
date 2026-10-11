"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { refreshGiaolyContexts } from "@/lib/giaoly-context";

export interface LinkState {
  ok?: boolean;
  error?: string;
}

/**
 * Liên kết tài khoản giaoly vào tài khoản store hiện tại.
 * Nhận access_token giaoly (do browser lấy được sau khi user đăng nhập giaoly),
 * verify token, đọc context (giáo xứ/vai trò/gói), lưu vào profiles (cache).
 */
export async function linkGiaoly(
  _prev: LinkState,
  formData: FormData
): Promise<LinkState> {
  const accessToken = String(formData.get("access_token") ?? "").trim();
  if (!accessToken) return { error: "Chưa đăng nhập được Giáo Lý Số. Thử lại." };

  const storeUser = await getCurrentUser();
  if (!storeUser) return { error: "Bạn chưa đăng nhập store." };

  const giaoly = createClient(
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

  // Verify token → user giaoly thật.
  const { data: gUser, error: gErr } = await giaoly.auth.getUser(accessToken);
  if (gErr || !gUser.user) return { error: "Phiên Giáo Lý Số đã hết hạn. Đăng nhập Giáo Lý Số lại rồi thử." };
  const giaolyUserId = gUser.user.id;

  // Đọc context qua RPC (chạy dưới danh tính user giaoly này).
  const { data: ctx, error: ctxErr } = await giaoly.rpc("get_my_context");
  if (ctxErr) {
    return {
      error:
        "Chưa đọc được thông tin giáo xứ từ Giáo Lý Số. Thử lại sau ít phút — lặp lại thì báo chúng tôi ở trang Liên hệ.",
    };
  }
  const c = (ctx ?? {}) as { parish_id?: string; role?: string; plan?: string };

  const admin = createStoreAdminClient();

  // Một tài khoản giaoly chỉ gắn được vào một tài khoản store.
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("giaoly_user_id", giaolyUserId)
    .neq("id", storeUser.id)
    .maybeSingle();
  if (taken) return { error: "Tài khoản Giáo Lý Số này đã liên kết với một tài khoản Ephata Store khác." };

  const { error: upErr } = await admin.from("profiles").upsert({
    id: storeUser.id,
    email: storeUser.email,
    giaoly_user_id: giaolyUserId,
    parish_id: c.parish_id ?? null,
    role: c.role ?? null,
    plan: c.plan ?? null,
    // get_my_context không trả hạn gói → buộc làm mới ngữ cảnh (gồm plan_expires_at) ở lần dùng đầu tiên.
    plan_expires_at: null,
    context_checked_at: null,
    giaoly_linked_at: new Date().toISOString(),
  });
  if (upErr) return { error: "Không lưu được liên kết. Thử lại sau ít phút." };

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Gỡ liên kết giaoly khỏi tài khoản store hiện tại. */
/** Làm mới gói / vai trò từ Giáo Lý Số ngay (không chờ chu kỳ 6 giờ) — vd vừa được cấp Pro / quyền quản trị. */
export async function refreshGiaolyNow() {
  const storeUser = await getCurrentUser();
  if (!storeUser) return;
  await refreshGiaolyContexts([storeUser.id]);
  revalidatePath("/account");
}

export async function unlinkGiaoly() {
  const storeUser = await getCurrentUser();
  if (!storeUser) return;

  const admin = createStoreAdminClient();
  await admin
    .from("profiles")
    .update({
      giaoly_user_id: null,
      parish_id: null,
      role: null,
      plan: null,
      plan_expires_at: null,
      context_checked_at: null,
      giaoly_linked_at: null,
    })
    .eq("id", storeUser.id);

  revalidatePath("/account");
  revalidatePath("/", "layout");
}
