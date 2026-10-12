/** Chuẩn hóa để tìm không dấu: "rung chuong vang" khớp "Rung Chuông Vàng". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[đĐ]/g, "d").toLowerCase();
}
