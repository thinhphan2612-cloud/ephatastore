import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createStoreAuthServerClient } from "@/lib/supabase/store-auth-server";

/** User đăng nhập hiện tại (tài khoản STORE), hoặc null. Cache theo request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createStoreAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Danh sách email admin từ env. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** User hiện tại nếu là admin, ngược lại null. */
export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  return user && isAdminEmail(user.email) ? user : null;
}
