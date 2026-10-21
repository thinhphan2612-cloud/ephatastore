import Link from "next/link";

export const metadata = { title: "Privacy Policy · Quyền riêng tư — Trình chiếu Thánh lễ" };

/**
 * Chính sách quyền riêng tư của app Trình chiếu Thánh lễ — URL này khai trong Microsoft Partner Center, đừng đổi đường dẫn.
 * Có bản tiếng Anh ở đầu: người duyệt Microsoft Store đọc tiếng Anh (lần nộp 19/10/2026 bị trả về 10.5.1 khi trang chỉ có tiếng Việt).
 */
export default function TrinhChieuThanhLePrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Privacy Policy — Trình chiếu Thánh lễ</h1>
      <p className="mt-2 text-sm text-text-faint">
        Chính sách quyền riêng tư · Last updated / Cập nhật: 21/10/2026 · Publisher / Nhà phát hành: ONETWENTYSIX VERSE
      </p>
      <p className="mt-2 text-sm">
        <a href="#tieng-viet">Tiếng Việt bên dưới ↓</a>
      </p>

      <div className="rich-text mt-8" lang="en">
        <h2>English</h2>
        <p>
          Trình chiếu Thánh lễ (Mass Projection) is a desktop application that runs on your computer. It does not require an
          account and does not collect, store on our servers or share any personal data.
        </p>

        <h3>1. Data stored on your device</h3>
        <p>
          Masses, songs, prayers, inserted videos, fonts you add and display settings are stored <strong>only on your
          device</strong>, in the application&apos;s data folder. <code>.mass</code> files are created only where you choose
          when you save or export. You can delete this data folder after uninstalling the application.
        </p>

        <h3>2. Network use</h3>
        <p>Preparing and projecting a Mass works offline. The application uses the network only to:</p>
        <ul>
          <li>
            <strong>Check for a new version</strong> (installer downloaded from Ephata Store only, at most once a day or when
            you choose Check for updates): it asks www.ephatastore.com for the latest version number, sending only the product
            name and the operating system. The Microsoft Store version never does this, because Microsoft Store updates it.
          </li>
          <li>
            <strong>Open the kpv.vn readings page</strong>: only when you click the Readings button, the page opens in your web
            browser.
          </li>
        </ul>
        <p>
          The application uses no cookies, no advertising, no analytics or tracking, and shares no data with third parties.
        </p>

        <h3>3. Contact</h3>
        <p>
          For any privacy question, use the <Link href="/lien-he">contact page</Link>.
        </p>
      </div>

      <div className="rich-text mt-12" lang="vi" id="tieng-viet">
        <h2>Tiếng Việt</h2>
        <p>
          Trình chiếu Thánh lễ là phần mềm chạy trên máy tính của bạn. Phần mềm không yêu cầu tài khoản và không thu thập,
          không gửi đi dữ liệu cá nhân nào.
        </p>

        <h3>1. Dữ liệu lưu trên máy</h3>
        <p>
          Buổi lễ, bài hát, kinh, video đã chèn, font bạn thêm vào và cài đặt giao diện <strong>chỉ lưu trên máy của bạn</strong>,
          trong thư mục dữ liệu của phần mềm. File <code>.mass</code> chỉ được tạo ở nơi bạn chọn khi bấm Lưu hoặc Xuất. Gỡ
          phần mềm thì bạn có thể xoá thư mục dữ liệu này.
        </p>

        <h3>2. Kết nối mạng</h3>
        <p>Soạn và chiếu không cần mạng. Phần mềm chỉ dùng mạng để:</p>
        <ul>
          <li>
            <strong>Kiểm tra phiên bản mới</strong> (chỉ bản tải từ Ephata Store, tối đa mỗi ngày một lần hoặc khi bạn bấm
            Kiểm tra cập nhật): hỏi máy chủ Ephata Store (www.ephatastore.com) số phiên bản mới nhất, chỉ gửi mã sản phẩm và hệ
            điều hành. Bản cài từ Microsoft Store không kiểm tra vì Store tự cập nhật.
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

        <h3>3. Liên hệ</h3>
        <p>
          Mọi câu hỏi về quyền riêng tư, gửi ở trang <Link href="/lien-he">Liên hệ</Link>.
        </p>
      </div>
    </div>
  );
}
