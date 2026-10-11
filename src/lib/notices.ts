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
  download_no_access: "Bạn chưa có quyền tải sản phẩm này (chưa mua hoặc đã hết hạn).",
  download_no_file: "Sản phẩm chưa có file tải về. Nhà phát hành đang cập nhật — thử lại sau hoặc liên hệ.",
  download_failed: "Không tạo được link tải. Thử lại sau ít phút.",
  device_removed: "Đã gỡ thiết bị. Giờ bạn kích hoạt key trên máy mới được.",
  device_reset_wait: "Mỗi key chỉ tự gỡ thiết bị 1 lần / 30 ngày. Cần gỡ gấp, hãy gửi yêu cầu ở trang Liên hệ.",
} as const;

export type NoticeCode = keyof typeof NOTICES;

export function noticeText(code: string | undefined): string | null {
  return code && Object.hasOwn(NOTICES, code) ? NOTICES[code as NoticeCode] : null;
}
