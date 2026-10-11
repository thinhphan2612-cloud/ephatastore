/**
 * Đường dẫn quay lại sau đăng nhập / đăng ký (?next=) — CHỈ nhận đường dẫn nội bộ.
 * Không kiểm thì link "ephatastore.com/login?next=https://trang-gia" đẩy người dùng sang trang lừa đảo sau khi đăng nhập.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
