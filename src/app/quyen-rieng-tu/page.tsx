import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Quyền riêng tư" };

/** Chính sách quyền riêng tư — liệt kê đúng dữ liệu store đang thu thập và bên xử lý. */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Chính sách quyền riêng tư</h1>
      <p className="mt-2 text-sm text-text-faint">Cập nhật ngày 11/10/2026</p>

      <div className="rich-text mt-8">
        <p>
          {COMPANY.name} (vận hành {COMPANY.store}) tôn trọng dữ liệu cá nhân của bạn. Chính sách này cho biết chúng tôi thu
          thập gì, dùng vào việc gì và bạn có những quyền nào.
        </p>

        <h2>1. Dữ liệu chúng tôi thu thập</h2>
        <ul>
          <li>
            <strong>Tài khoản</strong>: email, mật khẩu (lưu dạng mã hóa một chiều — chúng tôi không xem được mật khẩu của
            bạn).
          </li>
          <li>
            <strong>Giao dịch</strong>: lịch sử nạp point, mua sản phẩm, quyền sử dụng, key phần mềm và thiết bị đã kích hoạt.
          </li>
          <li>
            <strong>Liên kết Giáo Lý Số</strong> (nếu bạn liên kết): mã tài khoản, giáo xứ, vai trò, gói dịch vụ và hạn gói.
          </li>
          <li>
            <strong>Liên hệ</strong>: họ tên, email và nội dung bạn gửi qua form Liên hệ.
          </li>
          <li>
            <strong>Kỹ thuật</strong>: cookie đăng nhập và lựa chọn giao diện sáng / tối; dữ liệu một số ứng dụng lưu ngay trên
            trình duyệt của bạn.
          </li>
        </ul>

        <h2>2. Mục đích sử dụng</h2>
        <ul>
          <li>Đăng nhập, cấp và kiểm tra quyền dùng sản phẩm, xử lý nạp point và hoàn point.</li>
          <li>Gửi email cần thiết cho tài khoản (đặt lại mật khẩu, xác nhận) và trả lời yêu cầu hỗ trợ.</li>
          <li>Bật tính năng cho giáo xứ trên Giáo Lý Số khi bạn mua tính năng đó.</li>
        </ul>
        <p>Chúng tôi không bán dữ liệu cá nhân và không dùng cho quảng cáo của bên thứ ba.</p>

        <h2>3. Bên xử lý dữ liệu</h2>
        <ul>
          <li>Supabase — cơ sở dữ liệu và đăng nhập (máy chủ tại Singapore).</li>
          <li>Vercel — máy chủ website.</li>
          <li>Resend — gửi email.</li>
          <li>Giáo Lý Số — khi bạn liên kết tài khoản hoặc mua tính năng cho giáo xứ.</li>
        </ul>

        <h2>4. Lưu trữ và bảo mật</h2>
        <p>
          Dữ liệu được lưu trong thời gian tài khoản còn hoạt động và theo yêu cầu kế toán đối với giao dịch. Kết nối được mã
          hóa (HTTPS); quyền truy cập dữ liệu trong hệ thống được giới hạn cho người vận hành.
        </p>

        <h2>5. Quyền của bạn</h2>
        <ul>
          <li>Xem thông tin tài khoản, Thư viện và lịch sử Ví ngay trên {COMPANY.store}.</li>
          <li>Đổi mật khẩu, gỡ liên kết Giáo Lý Số trong trang Tài khoản.</li>
          <li>
            Yêu cầu sửa hoặc xóa tài khoản và dữ liệu cá nhân: gửi ở trang <Link href="/lien-he">Liên hệ</Link> từ email của
            tài khoản.
          </li>
        </ul>

        <h2>6. Liên hệ</h2>
        <p>
          Câu hỏi về quyền riêng tư, gửi ở trang <Link href="/lien-he">Liên hệ</Link>. Xem thêm{" "}
          <Link href="/dieu-khoan">Điều khoản sử dụng</Link>.
        </p>
      </div>
    </div>
  );
}
