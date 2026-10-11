"use server";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface GiaolyLoginState {
  tokenHash?: string;
  error?: string;
}

/**
 * Đăng nhập Store bằng tài khoản Giáo Lý Số.
 * Nhận access_token giaoly (browser đã đăng nhập giaoly) → verify → tự tạo/gắn
 * tài khoản store + cache gói → trả token_hash để browser verifyOtp lập session store.
 */
export async function loginWithGiaoly(
  _prev: GiaolyLoginState,
  formData: FormData
): Promise<GiaolyLoginState> {
  const accessToken = String(formData.get("access_token") ?? "").trim();
  if (!accessToken) return { error: "Thiếu token Giáo Lý Số." };

  // Verify token giaoly + đọc context.
  const giaoly = createClient(
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
  const { data: gUser, error: gErr } = await giaoly.auth.getUser(accessToken);
  if (gErr || !gUser.user?.email) return { error: "Token Giáo Lý Số không hợp lệ." };
  const email = gUser.user.email;
  const giaolyUserId = gUser.user.id;
  const { data: ctx } = await giaoly.rpc("get_my_context");
  const c = (ctx ?? {}) as { parish_id?: string; role?: string; plan?: string };

  const admin = createStoreAdminClient();

  // Đảm bảo tài khoản store tồn tại (bỏ qua nếu đã có).
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomUUID(),
  });
  if (created.error && !/registered|exists/i.test(created.error.message)) {
    return { error: created.error.message };
  }

  // Lấy user id store + token đăng nhập.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link.properties?.hashed_token || !link.user?.id) {
    return { error: linkErr?.message ?? "Không tạo được phiên đăng nhập." };
  }
  const storeUserId = link.user.id;

  // Gắn liên kết Giáo Lý Số + cache gói.
  await admin.from("profiles").upsert({
    id: storeUserId,
    email,
    giaoly_user_id: giaolyUserId,
    parish_id: c.parish_id ?? null,
    role: c.role ?? null,
    plan: c.plan ?? null,
    giaoly_linked_at: new Date().toISOString(),
  });

  return { tokenHash: link.properties.hashed_token };
}
