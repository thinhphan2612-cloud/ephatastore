import Link from "next/link";

export const metadata = { title: "Quyền riêng tư — EPHATA ebooks" };

/** Chính sách quyền riêng tư của app EPHATA ebooks — URL này khai trong Microsoft Partner Center, đừng đổi đường dẫn. */
export default function EphataEbooksPrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Chính sách quyền riêng tư — EPHATA ebooks</h1>
      <p className="mt-2 text-sm text-text-faint">Cập nhật ngày 12/10/2026 · Nhà phát hành: ONETWENTYSIX VERSE</p>

      <div className="rich-text mt-8">
        <p>EPHATA ebooks là ứng dụng đọc sách chạy trên máy tính của bạn (Windows, macOS).</p>

        <h2>1. Dữ liệu lưu trên máy</h2>
        <p>
          Thư viện sách, vị trí đọc, tô sáng, ghi chú, dấu trang, thời gian đọc và cài đặt hiển thị{" "}
          <strong>chỉ lưu trên máy của bạn</strong>. Ứng dụng không tải tệp sách hay nội dung ghi chú của bạn lên bất kỳ
          máy chủ nào. Tệp sao lưu chỉ được tạo khi bạn chọn.
        </p>

        <h2>2. Dữ liệu gửi qua mạng</h2>
        <p>Ứng dụng chỉ kết nối mạng để:</p>
        <ul>
          <li>
            <strong>Kích hoạt / xác minh / hủy kích hoạt bản Pro</strong> với máy chủ Ephata Store (www.ephatastore.com):
            gửi mã sản phẩm, key bạn nhập, một mã thiết bị ngẫu nhiên do ứng dụng tạo (không lấy từ thông tin phần cứng),
            hệ điều hành và phiên bản ứng dụng.
          </li>
          <li>
            <strong>Kiểm tra phiên bản mới</strong> (bản tải từ Ephata Store): gửi mã sản phẩm và hệ điều hành. Bản cài từ
            Microsoft Store không kiểm tra vì Store tự cập nhật.
          </li>
        </ul>
        <p>
          Ứng dụng không dùng quảng cáo, không theo dõi hành vi và không chia sẻ dữ liệu với bên thứ ba. Key bản quyền được
          lưu trong kho bí mật của hệ điều hành (Windows Credential Manager / macOS Keychain). Dữ liệu kích hoạt trên máy
          chủ Ephata Store được xử lý theo <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư của Ephata Store</Link>.
        </p>

        <h2>3. Liên hệ</h2>
        <p>
          Mọi câu hỏi về quyền riêng tư, gửi ở trang <Link href="/lien-he">Liên hệ</Link>.
        </p>
      </div>
    </div>
  );
}
