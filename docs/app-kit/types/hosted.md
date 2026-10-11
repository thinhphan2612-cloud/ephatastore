# Loại 2 — Chạy trên store (game / công cụ web)

Web app hoặc game **build tĩnh** (HTML/CSS/JS), host ngay trên Ephata và chạy trong khung (iframe) ở trang `/play/<slug>`.
Trên admin chọn thẻ **Chạy trên store** → chọn **Game** hoặc **Công cụ web**.

## Dùng khi
- Game giáo lý, trắc nghiệm, ô chữ, flashcard, trò chơi tương tác.
- Công cụ chạy trong trình duyệt: tạo lịch, sinh tài liệu, tra cứu, **công cụ có AI** (Ephata lo key AI và trừ point).
- **Không cần server/database riêng**: toàn bộ logic chạy ở trình duyệt.

Không phải loại này nếu: cần tài khoản riêng, lưu dữ liệu dùng chung nhiều người, server riêng (→ Link ngoài);
cần cài đặt/truy cập máy tính (→ Phần mềm bán key).

## Sản phẩm giao cho Ephata
- **1 file `.zip`** chứa bản build: `index.html` ở gốc (hoặc trong 1 thư mục con — Ephata tự bóc lớp thư mục ngoài cùng).
- **Ảnh bìa** 16:9 (vd 1600×900).
- Tên, mô tả ngắn, danh mục; với game có phí: giá.

## Yêu cầu kỹ thuật (bắt buộc)
| Mục | Yêu cầu |
|---|---|
| Đường dẫn | **Tương đối** (`./assets/x.png`), không bắt đầu bằng `/`. App chạy dưới `/g/<id>/`. Vite: `base: './'` · Angular: `ng build --base-href ./` · CRA: `"homepage": "."`. Next.js export tĩnh khó làm đường dẫn tương đối — ưu tiên Vite. |
| Điều hướng | **Hash routing** (`#/trang`). Không có rewrite phía server → tải lại một route dạng `/g/<id>/trang` sẽ 404. |
| Bí mật | Không đặt API key/secret trong code — ai cũng xem được. Cần AI → dùng API AI của Ephata (dưới). |
| Lưu dữ liệu | Chỉ `localStorage` / `IndexedDB` (theo trình duyệt). App chạy **cùng origin với ephatastore.com và mọi app khác** → **đặt tiền tố khóa theo slug** (vd `quiz-giao-ly:diem`), đừng `localStorage.clear()`. |
| Loại file | `.html .js .mjs .css .json` được Ephata phục vụ đúng content-type. Ảnh/âm thanh/video/font (`png jpg gif webp svg ico mp3 wav ogg mp4 webm woff woff2 ttf otf`) tải thẳng từ Storage. Loại khác (vd `.wasm`) bị gán `application/octet-stream`. |
| Engine game | Phaser, PixiJS, Three.js, JS thuần: ổn. Unity/Godot (dùng `.wasm`, file nén `.br/.gz`): **chưa kiểm chứng** — tắt nén khi build và thử kỹ. |
| Dung lượng | Mỗi file ≤ 50MB; số file không giới hạn (tải lên từng file). Giữ tổng nhỏ để mở nhanh. |
| Giao diện | Chạy trong khung cao ~78% màn hình, có nút Toàn màn hình (iframe cho phép `fullscreen; autoplay`). Thiết kế co giãn, dùng được trên điện thoại. |
| Âm thanh | Chỉ phát sau khi người dùng bấm (chính sách trình duyệt). |

## Dùng AI qua Ephata (công cụ web)
Gọi cùng origin, trình duyệt tự gửi phiên đăng nhập của người dùng; point trừ vào ví họ.

```js
const body = {
  contents: [{ role: "user", parts: [{ text: "Soạn 5 câu hỏi về Mùa Vọng" }] }],
  systemInstruction: { parts: [{ text: "Bạn là trợ lý giáo lý, trả lời tiếng Việt." }] }, // tùy chọn
  maxOutputTokens: 4096,                                                                  // tùy chọn
};
// 1) Ước lượng point tối đa → hỏi người dùng xác nhận
const est = await fetch("/api/ai/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
// 2) Chạy thật
const res = await fetch("/api/ai/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const data = await res.json(); // 200: { text, usage, pointsCharged, balance }
```
Lỗi: `401` chưa đăng nhập · `402` `{ code: "INSUFFICIENT_POINTS", needed }` → mời nạp point bằng link
`<a href="/wallet" target="_top">` (phải `target="_top"` để thoát khỏi khung) · `400` body sai · `502` lỗi model (point đã hoàn).
Model hiện tại: Gemini Flash; giá point tính theo token thực dùng.

## Giá & quyền
- **Công cụ web**: mở tự do cho người đã đăng nhập; doanh thu đến từ point AI.
- **Game miễn phí**: ai đăng nhập cũng chơi.
- **Game có phí (Tier PRO)**: mua 1 lần dùng vĩnh viễn, giá = "Giá/tháng" quy ra point. Người có Pro Giáo Lý Số chơi miễn phí
  và có nút thêm game vào Giáo Lý Số (tính năng phía Giáo Lý Số chưa bật).

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Chạy trên store**.
2. Chọn **Game** hoặc **Công cụ web**, nhập tên, danh mục, (game) Tier + Giá/tháng, mô tả ngắn, ảnh bìa, file `.zip`.
3. Bấm tải lên → chờ tải từng file → chuyển sang trang sản phẩm. Slug tự tạo = tên + 6 ký tự ngẫu nhiên.

## Kiểm sau khi lên
- Mở trang sản phẩm → **Chơi ngay / Mở công cụ** → app chạy, ảnh/âm thanh tải đủ (mở DevTools xem không có lỗi 404).
- Bấm Toàn màn hình, thử trên điện thoại.
- Công cụ có AI: chạy 1 lần, số point trừ khớp thông báo.

## Giới hạn hiện tại (2026-10-11)
- **Chưa có cập nhật file** cho game/công cụ đã đăng. Bản mới = đăng sản phẩm mới (slug mới; người đã mua bản cũ không
  tự có bản mới). Cần chức năng "tải lại bản build" ở Ephata — báo Felix trước khi phát hành bản 2.
- File host ở kho **công khai**: ai biết đường link `/g/<id>/index.html` mở được mà không cần mua. Cổng thu tiền chỉ nằm ở
  trang `/play`. Game có phí chấp nhận rủi ro này (link chứa mã ngẫu nhiên, không lộ trên trang).
