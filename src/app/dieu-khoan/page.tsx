import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Điều khoản sử dụng" };

/** Điều khoản sử dụng — mô tả đúng cách store đang vận hành (point, quyền dùng, hoàn point). */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Điều khoản sử dụng</h1>
      <p className="mt-2 text-sm text-text-faint">Cập nhật ngày 11/10/2026</p>

      <div className="rich-text mt-8">
        <p>
          {COMPANY.store} (ephatastore.com) do <strong>{COMPANY.name}</strong> vận hành. Khi tạo tài khoản, nạp point hoặc
          dùng sản phẩm trên {COMPANY.store}, bạn đồng ý với các điều khoản dưới đây.
        </p>

        <h2>1. Tài khoản</h2>
        <ul>
          <li>Bạn chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động trên tài khoản của mình.</li>
          <li>Quên mật khẩu: dùng chức năng &quot;Quên mật khẩu&quot; ở trang đăng nhập để đặt lại qua email.</li>
          <li>
            Liên kết tài khoản Giáo Lý Số là tùy chọn; khi liên kết, {COMPANY.store} đọc giáo xứ, vai trò và gói dịch vụ của
            bạn bên Giáo Lý Số để mở quyền tương ứng.
          </li>
        </ul>

        <h2>2. Point</h2>
        <ul>
          <li>Point là đơn vị thanh toán trên {COMPANY.store}: 100đ = 1 point.</li>
          <li>Nạp point bằng chuyển khoản đúng số tiền và nội dung; point được cộng sau khi chúng tôi xác nhận đã nhận tiền.</li>
          <li>Point không có hạn sử dụng, không quy đổi lại thành tiền và không chuyển sang tài khoản khác.</li>
        </ul>

        <h2>3. Mua sản phẩm và quyền sử dụng</h2>
        <ul>
          <li>
            <strong>Mua vĩnh viễn</strong> (file tải về, game, key phần mềm): dùng không thời hạn trên tài khoản đã mua.
          </li>
          <li>
            <strong>Gói năm / mua lẻ / Full Topping</strong>: dùng đến hết hạn ghi trong Thư viện. Không tự động gia hạn; mua
            thêm trước khi hết hạn thì thời gian được cộng nối.
          </li>
          <li>
            <strong>Dùng thử</strong>: mỗi tài khoản dùng thử một sản phẩm một lần.
          </li>
          <li>
            <strong>Tính năng Giáo Lý Số</strong>: mua bởi quản trị giáo xứ và áp dụng cho cả giáo xứ trên Giáo Lý Số.
          </li>
          <li>
            <strong>Phần mềm bán key</strong>: mỗi key dùng trên số thiết bị giới hạn ghi ở trang sản phẩm; không chia sẻ hay
            bán lại key.
          </li>
          <li>
            Một số ứng dụng tính phí theo lượt dùng bằng point trong Ví {COMPANY.store}; ứng dụng chỉ trừ được point khi bạn đã
            cho phép, và bạn có thể ngắt kết nối bất cứ lúc nào ở trang Ví.
          </li>
        </ul>

        <h2>4. Hoàn point</h2>
        <ul>
          <li>Sản phẩm số đã giao (đã tải về, đã kích hoạt key, đã bật tính năng) không hoàn point.</li>
          <li>
            Lỗi từ phía hệ thống (trừ sai, trừ trùng, dịch vụ trong ứng dụng không thực hiện được) được hoàn point vào Ví.
          </li>
          <li>
            Đã chuyển khoản nhưng sau 24 giờ làm việc chưa được cộng point: gửi yêu cầu ở trang{" "}
            <Link href="/lien-he">Liên hệ</Link> kèm mã nạp.
          </li>
        </ul>

        <h2>5. Nội dung và bản quyền</h2>
        <p>
          Sản phẩm thuộc quyền của nhà phát hành ghi trên trang sản phẩm. Bạn được dùng cho mục đích của mình hoặc của giáo
          xứ / cộng đoàn; không sao chép để bán lại, phát tán công khai hoặc gỡ bỏ thông tin bản quyền.
        </p>

        <h2>6. Hành vi bị cấm</h2>
        <ul>
          <li>Truy cập trái phép, phá hoại hoặc lợi dụng lỗi hệ thống để nhận point / quyền dùng không đúng.</li>
          <li>Dùng tài khoản hoặc email của người khác.</li>
        </ul>
        <p>Vi phạm có thể dẫn tới khóa tài khoản và thu hồi quyền dùng liên quan.</p>

        <h2>7. Giới hạn trách nhiệm</h2>
        <p>
          Chúng tôi cố gắng để dịch vụ hoạt động ổn định nhưng không bảo đảm không bao giờ gián đoạn. Sản phẩm do nhà phát
          hành bên thứ ba cung cấp được hỗ trợ bởi chính nhà phát hành đó.
        </p>

        <h2>8. Thay đổi điều khoản</h2>
        <p>Điều khoản có thể được cập nhật; ngày cập nhật ghi ở đầu trang. Tiếp tục sử dụng nghĩa là bạn đồng ý bản mới.</p>

        <h2>9. Liên hệ</h2>
        <p>
          Mọi câu hỏi về điều khoản, gửi ở trang <Link href="/lien-he">Liên hệ</Link>. Xem thêm{" "}
          <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>.
        </p>
      </div>
    </div>
  );
}
