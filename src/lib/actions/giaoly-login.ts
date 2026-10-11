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
 * Nhận access_token giaoly (browser đã đăng nhập giaoly) → verify → vào tài khoản store ĐÃ LIÊN KẾT với đúng
 * tài khoản Giáo Lý Số này; chưa có thì tạo tài khoản store mới + liên kết. Trả token_hash để browser verifyOtp.
 *
 * KHÔNG ghép theo email: Giáo Lý Số cho đăng ký không xác minh email, nên email ở đó không chứng minh được ai
 * sở hữu tài khoản store cùng email (ghép theo email = ai cũng vào được tài khoản người khác, kể cả admin).
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

  // 1) Tài khoản store đã liên kết với đúng tài khoản Giáo Lý Số này.
  const { data: linked } = await admin
    .from("profiles")
    .select("id")
    .eq("giaoly_user_id", giaolyUserId)
    .order("giaoly_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let storeUserId: string;
  let storeEmail: string;
  if (linked) {
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(linked.id);
    if (uErr || !u.user?.email) return { error: "Không tìm thấy tài khoản Store đã liên kết." };
    storeUserId = u.user.id;
    storeEmail = u.user.email;
  } else {
    // 2) Chưa liên kết → tạo tài khoản store mới. Email đã thuộc tài khoản store khác → từ chối (không ghép theo email).
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomUUID(),
    });
    if (created.error || !created.data.user) {
      if (/registered|exists/i.test(created.error?.message ?? ""))
        return {
          error:
            "Email này đã có tài khoản Ephata Store. Hãy đăng nhập bằng mật khẩu Store ở khung trên, rồi liên kết Giáo Lý Số trong trang Tài khoản.",
        };
      return { error: created.error?.message ?? "Không tạo được tài khoản Store." };
    }
    storeUserId = created.data.user.id;
    storeEmail = email;
  }

  // Token đăng nhập cho đúng tài khoản store ở trên.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: storeEmail,
  });
  if (linkErr || !link.properties?.hashed_token || link.user?.id !== storeUserId) {
    return { error: linkErr?.message ?? "Không tạo được phiên đăng nhập." };
  }

  // Gắn liên kết Giáo Lý Số + cache gói.
  await admin.from("profiles").upsert({
    id: storeUserId,
    email: storeEmail,
    giaoly_user_id: giaolyUserId,
    parish_id: c.parish_id ?? null,
    role: c.role ?? null,
    plan: c.plan ?? null,
    // get_my_context không trả hạn gói → buộc làm mới ngữ cảnh (gồm plan_expires_at) ở lần dùng đầu tiên.
    plan_expires_at: null,
    context_checked_at: null,
    ...(linked ? {} : { giaoly_linked_at: new Date().toISOString() }),
  });

  return { tokenHash: link.properties.hashed_token };
}
