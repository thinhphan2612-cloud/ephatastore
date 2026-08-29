"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

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
  if (!accessToken) return { error: "Thiếu token giaoly." };

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
  if (gErr || !gUser.user) return { error: "Token giaoly không hợp lệ." };
  const giaolyUserId = gUser.user.id;

  // Đọc context qua RPC (chạy dưới danh tính user giaoly này).
  const { data: ctx } = await giaoly.rpc("get_my_context");
  const c = (ctx ?? {}) as { parish_id?: string; role?: string; plan?: string };

  const admin = createStoreAdminClient();

  // Một tài khoản giaoly chỉ gắn được vào một tài khoản store.
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("giaoly_user_id", giaolyUserId)
    .neq("id", storeUser.id)
    .maybeSingle();
  if (taken) return { error: "Tài khoản giaoly này đã liên kết với một tài khoản store khác." };

  const { error: upErr } = await admin.from("profiles").upsert({
    id: storeUser.id,
    email: storeUser.email,
    giaoly_user_id: giaolyUserId,
    parish_id: c.parish_id ?? null,
    role: c.role ?? null,
    plan: c.plan ?? null,
    giaoly_linked_at: new Date().toISOString(),
  });
  if (upErr) return { error: upErr.message };

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Gỡ liên kết giaoly khỏi tài khoản store hiện tại. */
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
      giaoly_linked_at: null,
    })
    .eq("id", storeUser.id);

  revalidatePath("/account");
  revalidatePath("/", "layout");
}
