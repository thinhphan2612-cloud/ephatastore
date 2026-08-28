/** Định dạng tiền VND. price 0 -> "Miễn phí". */
export function formatPrice(vnd: number): string {
  if (vnd <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(vnd);
}

/** Định dạng ngày kiểu Việt Nam (dd/mm/yyyy). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
