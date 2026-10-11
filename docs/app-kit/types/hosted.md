# Loại 2 — Chạy trên store (game / công cụ web)

Web app hoặc game **build tĩnh** (HTML/CSS/JS), host ngay trên Ephata và chạy trong khung (iframe) ở trang `/play/<slug>`.
Trên admin chọn thẻ **Chạy trên store** → chọn **Game** hoặc **Công cụ web**.

## Dùng khi
- Game giáo lý, trắc nghiệm, ô chữ, flashcard, trò chơi tương tác.
- Công cụ chạy trong trình duyệt: tạo lịch, sinh tài liệu, tra cứu… — **thu tiền theo lượt dùng qua Ví Ephata** được.
- **Không cần server/database riêng**: toàn bộ logic chạy ở trình duyệt.

Không phải loại này nếu: cần tài khoản riêng, lưu dữ liệu dùng chung nhiều người, server riêng (→ Link ngoài);
cần cài đặt/truy cập máy tính (→ Phần mềm bán key).

## Sản phẩm giao cho Ephata
- **1 file `.zip`** chứa bản build: `index.html` ở gốc (hoặc trong 1 thư mục con — Ephata tự bóc lớp thư mục ngoài cùng).
- **Ảnh bìa** 16:9 (vd 1600×900), tối đa 5MB.
- Tên, mô tả ngắn, danh mục; game có phí: giá mua vĩnh viễn.

## Yêu cầu kỹ thuật (bắt buộc)
| Mục | Yêu cầu |
|---|---|
| Đường dẫn | **Tương đối** (`./assets/x.png`), không bắt đầu bằng `/`. App chạy dưới `/g/<id>/<mã truy cập>/` — đường dẫn tương đối tự mang theo mã. Vite: `base: './'` · Angular: `ng build --base-href ./` · CRA: `"homepage": "."`. Next.js export tĩnh khó làm đường dẫn tương đối — ưu tiên Vite. |
| Điều hướng | **Hash routing** (`#/trang`). Không có rewrite phía server → tải lại một route dạng `/g/.../trang` sẽ 404. |
| Bí mật | Không đặt API key/secret trong code — ai cũng xem được. Cần thu tiền → dùng Ví Ephata (dưới). |
| Lưu dữ liệu | Chỉ `localStorage` / `IndexedDB` (theo trình duyệt). App chạy **cùng origin với ephatastore.com và mọi app khác** → **đặt tiền tố khóa theo slug** (vd `quiz-giao-ly:diem`), đừng `localStorage.clear()`. |
| Loại file | Lưu đúng content-type theo đuôi file: html, js, css, json, wasm, ảnh (png/jpg/webp/avif/gif/svg/ico), âm thanh (mp3/m4a/aac/wav/ogg/flac), video (mp4/webm), font (woff/woff2/ttf/otf), glb/gltf. Đuôi khác lưu `application/octet-stream`. |
| Engine game | Phaser, PixiJS, Three.js, JS thuần: ổn. Unity/Godot (`.wasm`): wasm phục vụ đúng `application/wasm`; **tắt nén khi build** (không dùng `.br/.gz`). Chưa thử engine thật — kiểm kỹ lần đầu. |
| Dung lượng | Mỗi file ≤ 50MB; số file không giới hạn (tải lên từng file). Giữ tổng nhỏ để mở nhanh. |
| Giao diện | Chạy trong khung cao ~78% màn hình, có nút Toàn màn hình (iframe cho phép `fullscreen; autoplay`). Thiết kế co giãn, dùng được trên điện thoại. |
| Âm thanh | Chỉ phát sau khi người dùng bấm (chính sách trình duyệt). |

## Bảo vệ nội dung (Ephata lo sẵn)
File bản build nằm ở kho **riêng tư**. Trang chơi chỉ cấp **mã truy cập** (ký, gắn với người chơi, hạn 12 giờ) cho người đã
có quyền; link không mã / mã giả / mã hết hạn đều bị chặn. App không cần làm gì thêm, miễn là dùng đường dẫn tương đối.

## Thu tiền theo lượt dùng — Ví Ephata
Bật ô **"App trừ point qua Ví Ephata"** trên admin. Người dùng được hỏi cho phép một lần khi mở công cụ. Gọi API cùng origin
từ trình duyệt — Ephata xác thực bằng mã truy cập trong URL + phiên đăng nhập của người dùng:

```js
const ephata = (path, body = {}) =>
  fetch(`/api/apps/v1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ephata-hosted": location.pathname },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const { balance } = await ephata("balance");                 // số dư point
const r = await ephata("charge", {
  amount: 50,                                               // point (100đ = 1 point)
  reason: "Xuất 10 giấy khen PDF",                          // hiện trong lịch sử Ví của người dùng
  idempotencyKey: crypto.randomUUID(),                      // GIỮ NGUYÊN khóa khi thử lại — Ephata không trừ 2 lần
});
if (r.ok) {
  // làm dịch vụ; nếu dịch vụ lỗi → hoàn point:
  // await ephata("refund", { chargeId: r.chargeId });      // hoặc { chargeId, amount } để hoàn một phần
} else if (r.error === "INSUFFICIENT_POINTS") {
  // mời nạp point: <a href="/wallet" target="_top">Nạp point</a>  (target="_top" để thoát khỏi khung)
}
```
Mã lỗi: `INSUFFICIENT_POINTS` (kèm `needed`, `balance`, `topupUrl`) · `CONNECTION_REVOKED` (người dùng đã ngắt kết nối —
mời mở lại từ trang sản phẩm) · `NOT_SIGNED_IN` · `WALLET_DISABLED` (chưa bật ô Ví) · `IDEMPOTENCY_CONFLICT` · `BAD_REQUEST`.
Nên **báo trước giá** cho người dùng và trừ khi họ bấm xác nhận.

## Giá & quyền
- **Công cụ web**: mở tự do cho người đã đăng nhập; doanh thu qua Ví Ephata (nếu bật).
- **Game miễn phí**: ai đăng nhập cũng chơi.
- **Game có phí**: mua 1 lần dùng vĩnh viễn (giá nhập bằng VND, trả bằng point). Ô **"Miễn phí cho Pro Giáo Lý Số"**: tick thì
  tài khoản Pro Giáo Lý Số chơi miễn phí; không tick thì ai cũng mua.

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Chạy trên store**.
2. Chọn **Game** hoặc **Công cụ web**, nhập tên, danh mục, (game) Tier + Giá mua vĩnh viễn + ô Pro, mô tả ngắn, ảnh bìa, file `.zip`.
3. Bấm tải lên → chờ tải từng file → chuyển sang trang sản phẩm. Slug tự tạo = tên + 6 ký tự ngẫu nhiên.
4. Công cụ có thu tiền: mở **Sửa** sản phẩm → tick **App trừ point qua Ví Ephata** → Lưu.

**Phát hành bản mới**: mở **Sửa** sản phẩm → khung **Bản build** → chọn `.zip` mới → **Tải bản build mới**. Thay tại chỗ:
cùng sản phẩm, cùng slug, người đã mua giữ quyền, bản cũ bị xóa.

## Kiểm sau khi lên
- Mở trang sản phẩm → **Chơi ngay / Mở công cụ** → app chạy, ảnh/âm thanh tải đủ (DevTools không có lỗi 404).
- Bấm Toàn màn hình, thử trên điện thoại.
- Có Ví: chạy 1 lần dịch vụ có phí → số dư giảm đúng, lịch sử Ví ghi đúng lý do; thử thiếu point.
