/**
 * Thông báo hiển thị qua URL (?notice= / ?error=) CHỈ nhận mã cố định — không in chữ lấy từ URL
 * (trước đây ai cũng tạo được link hiện cảnh báo giả trên domain thật, vd "Tài khoản bị khóa, gọi số…").
 */
export const NOTICES = {
  product_unavailable: "Sản phẩm không tồn tại hoặc đã ẩn.",
  needs_purchase: "Sản phẩm này cần mua bằng point.",
  feature_parish_admin: "Tính năng Giáo Lý Số chỉ quản trị giáo xứ (đã liên kết tài khoản) mới nhận / dùng thử / mua được.",
  no_trial: "Sản phẩm này không có dùng thử.",
  trial_used: "Bạn đã dùng thử (hoặc đã từng mua) sản phẩm này — không dùng thử lại được.",
  kind_invalid: "Gói mua này không áp dụng cho sản phẩm. Hãy chọn lại từ trang sản phẩm.",
  link_expired: "Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu gửi lại.",
} as const;

export type NoticeCode = keyof typeof NOTICES;

export function noticeText(code: string | undefined): string | null {
  return code && Object.hasOwn(NOTICES, code) ? NOTICES[code as NoticeCode] : null;
}
