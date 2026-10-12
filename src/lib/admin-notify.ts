import "server-only";
import { sendEmail } from "@/lib/email";
import { adminNoticeEmail } from "@/lib/email-templates";

/**
 * Email báo admin những việc cần xử lý (đơn nạp mới, đồng bộ Giáo Lý Số lỗi). Gửi tới ADMIN_NOTIFY_EMAIL
 * (mặc định CONTACT_EMAIL_TO / 126verse@gmail.com). Lỗi gửi chỉ ghi log — không làm hỏng thao tác chính.
 */
export async function notifyAdmin(n: Parameters<typeof adminNoticeEmail>[0]): Promise<void> {
  try {
    const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.CONTACT_EMAIL_TO || "126verse@gmail.com";
    const sent = await sendEmail({ to, ...adminNoticeEmail(n) });
    if (!sent.ok) console.error("admin notify", sent.error);
  } catch (e) {
    console.error("admin notify", e);
  }
}
