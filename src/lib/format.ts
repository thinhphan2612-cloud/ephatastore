/** Định dạng tiền VND. price 0 -> "Miễn phí". */
export function formatPrice(vnd: number): string {
  if (vnd <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(vnd);
}

/** Giờ Việt Nam — server (Vercel) chạy UTC, không đặt múi giờ thì giờ hiển thị lệch 7 tiếng. */
const TZ = "Asia/Ho_Chi_Minh";

/** Định dạng ngày kiểu Việt Nam (dd/mm/yyyy), theo giờ Việt Nam. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Ngày + giờ:phút theo giờ Việt Nam (vd 11/10/2026, 22:30). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}
