/**
 * Lỗi Supabase Auth → câu tiếng Việt cho người dùng (không hiện thẳng message tiếng Anh / kỹ thuật).
 * Dùng ở client (form đăng nhập, đăng ký, Giáo Lý Số, đổi mật khẩu). `who` để ghi rõ mật khẩu nào sai.
 */
export function authErrorVi(err: { message?: string; code?: string; status?: number } | null | undefined, who = ""): string {
  const msg = err?.message ?? "";
  const code = err?.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg))
    return `Email hoặc mật khẩu${who ? ` ${who}` : ""} không đúng.`;
  if (code === "user_already_exists" || /already (registered|been registered)/i.test(msg))
    return "Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng Quên mật khẩu.";
  if (err?.status === 429 || /rate limit|too many|security purposes|seconds/i.test(msg))
    return "Bạn thao tác quá nhanh. Đợi vài phút rồi thử lại.";
  if (code === "weak_password" || /password should|weak password/i.test(msg))
    return "Mật khẩu quá yếu — dùng ít nhất 6 ký tự, nên có cả chữ và số.";
  if (code === "same_password" || /different from the old|same as/i.test(msg)) return "Mật khẩu mới phải khác mật khẩu cũ.";
  if (code === "email_address_invalid" || /invalid format|email address .* invalid|unable to validate email/i.test(msg))
    return "Email không hợp lệ.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg))
    return "Email chưa được xác nhận. Mở email xác nhận (kể cả mục Spam) rồi thử lại.";
  if (/session|not authenticated|jwt/i.test(msg))
    return "Phiên đăng nhập đã hết. Đăng nhập lại (hoặc yêu cầu lại link Quên mật khẩu) rồi thử lại.";
  if (/failed to fetch|network|load failed/i.test(msg)) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return "Có lỗi xảy ra. Thử lại sau ít phút — lặp lại thì báo chúng tôi ở trang Liên hệ.";
}
