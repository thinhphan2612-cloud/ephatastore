import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createStoreAuthServerClient } from "@/lib/supabase/store-auth-server";
import { safeNext } from "@/lib/safe-next";

/**
 * Đích của link trong email (đặt lại mật khẩu, xác nhận đăng ký) → lập phiên đăng nhập rồi chuyển tới ?next=.
 * Nhận cả 2 dạng link Supabase:
 *  - ?code=…                     (PKCE — chỉ mở được trên cùng trình duyệt đã yêu cầu)
 *  - ?token_hash=…&type=recovery (mẫu email trỏ thẳng về đây — mở được trên máy khác)
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createStoreAuthServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Thiếu mã xác nhận") };

  if (error) {
    return NextResponse.redirect(new URL("/login?error=link_expired", req.url));
  }
  return NextResponse.redirect(new URL(next, req.url));
}
