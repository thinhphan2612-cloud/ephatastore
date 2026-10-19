import Link from "next/link";

export const metadata = { title: "Quyền riêng tư — Trình chiếu Thánh lễ" };

/** Chính sách quyền riêng tư của app Trình chiếu Thánh lễ — URL này khai trong Microsoft Partner Center, đừng đổi đường dẫn. */
export default function TrinhChieuThanhLePrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Chính sách quyền riêng tư — Trình chiếu Thánh lễ</h1>
      <p className="mt-2 text-sm text-text-faint">Cập nhật ngày 19/10/2026 · Nhà phát hành: ONETWENTYSIX VERSE</p>

      <div className="rich-text mt-8">
        <p>
          Trình chiếu Thánh lễ là phần mềm miễn phí chạy trên máy tính của bạn. Phần mềm không yêu cầu tài khoản và không thu
          thập, không gửi đi dữ liệu cá nhân nào.
        </p>

        <h2>1. Dữ liệu lưu trên máy</h2>
        <p>
          Buổi lễ, bài hát, kinh, video đã chèn và cài đặt giao diện <strong>chỉ lưu trên máy của bạn</strong>, trong thư mục
          dữ liệu của phần mềm. File <code>.mass</code> chỉ được tạo ở nơi bạn chọn khi bấm Lưu hoặc Xuất. Gỡ phần mềm thì
          bạn có thể xoá thư mục dữ liệu này.
        </p>

        <h2>2. Kết nối mạng</h2>
        <p>Soạn và chiếu không cần mạng. Phần mềm chỉ dùng mạng để:</p>
        <ul>
          <li>
            <strong>Kiểm tra phiên bản mới</strong> (bản tải từ Ephata Store, tối đa mỗi ngày một lần hoặc khi bạn bấm Kiểm tra
            cập nhật): hỏi máy chủ Ephata Store (www.ephatastore.com) số phiên bản mới nhất, chỉ gửi mã sản phẩm và hệ điều
            hành. Bản cài từ Microsoft Store không kiểm tra vì Store tự cập nhật.
          </li>
          <li>
            <strong>Mở trang bài đọc kpv.vn</strong>: chỉ khi bạn bấm nút Bài đọc, phần mềm mở trang trong trình duyệt của bạn.
          </li>
        </ul>
        <p>
          Phần mềm không dùng cookie, không quảng cáo, không theo dõi hành vi và không chia sẻ dữ liệu với bên thứ ba. Khi bạn
          tải phần mềm trên Ephata Store, dữ liệu tài khoản store được xử lý theo{" "}
          <Link href="/quyen-rieng-tu">Chính sách quyền riêng tư của Ephata Store</Link>.
        </p>

        <h2>3. Liên hệ</h2>
        <p>
          Mọi câu hỏi về quyền riêng tư, gửi ở trang <Link href="/lien-he">Liên hệ</Link>.
        </p>
      </div>
    </div>
  );
}
