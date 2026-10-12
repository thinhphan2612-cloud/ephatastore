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
- **1 file `.zip`** chứa bản build: `index.html` (**đúng chữ thường**) ở gốc (hoặc trong 1 thư mục con — Ephata tự bóc lớp thư mục
  ngoài cùng). Tên file / thư mục **không dấu**: a–z, 0–9, `. _ -` (Ephata từ chối tên có dấu / ký tự đặc biệt trước khi tải lên).
- **Ảnh bìa** 16:9 (vd 1600×900), tối đa 5MB.
- **Logo vuông** + tối đa **4 ảnh / video minh họa** (ảnh ≤ 10MB, MP4/WebM ≤ 50MB hoặc link YouTube) — xem README, mục "Quy ước chung". Game / công cụ: 1 video gameplay ngắn + 2–3 ảnh màn hình. Form tải lên chỉ có ảnh bìa → thêm logo / minh họa ở trang **Sửa**.
- Tên, mô tả ngắn, danh mục; game có phí: giá mua vĩnh viễn.

## Yêu cầu kỹ thuật (bắt buộc)
| Mục | Yêu cầu |
|---|---|
| Đường dẫn | **Tương đối** (`./assets/x.png`), không bắt đầu bằng `/`. App chạy dưới `/g/<id>/<mã truy cập>/` — đường dẫn tương đối tự mang theo mã. Vite: `base: './'` · Angular: `ng build --base-href ./` · CRA: `"homepage": "."`. Next.js export tĩnh khó làm đường dẫn tương đối — ưu tiên Vite. |
| Điều hướng | **Hash routing** (`#/trang`). Không có rewrite phía server → tải lại một route dạng `/g/.../trang` sẽ 404. |
| Bí mật | Không đặt API key/secret trong code — ai cũng xem được. Cần thu tiền → dùng Ví Ephata (dưới). |
| Lưu dữ liệu | Chỉ `localStorage` / `IndexedDB` (theo trình duyệt). App chạy trên domain **`play.ephatastore.com`** (tách khỏi store), dùng chung với các app host khác → **đặt tiền tố khóa theo slug** (vd `quiz-giao-ly:diem`), đừng `localStorage.clear()`. |
| Liên kết | Link tới trang store phải là URL tuyệt đối `https://www.ephatastore.com/...` kèm `target="_top"` (app chạy trên domain khác, trong khung). |
| Loại file | Lưu đúng content-type theo đuôi file: html, js, css, json, wasm, ảnh (png/jpg/webp/avif/gif/svg/ico), âm thanh (mp3/m4a/aac/wav/ogg/flac), video (mp4/webm), font (woff/woff2/ttf/otf), glb/gltf. Đuôi khác lưu `application/octet-stream`. |
| Engine game | Phaser, PixiJS, Three.js, JS thuần: ổn. Unity/Godot (`.wasm`): wasm phục vụ đúng `application/wasm`; **tắt nén khi build** (không dùng `.br/.gz`). Chưa thử engine thật — kiểm kỹ lần đầu. |
| Dung lượng | **html / htm / js / mjs / css / json: mỗi file < 4MB** (các file này được trả qua máy chủ Ephata, Vercel giới hạn ~4.5MB/response — file lớn hơn sẽ trắng màn hình; Ephata chặn ngay lúc tải lên). Bundle lớn → tách chunk (Vite `build.rollupOptions.output.manualChunks`, dynamic `import()`); dữ liệu lớn → đưa ra file nhị phân / ảnh. **Ảnh / âm thanh / video / wasm / font / glb: mỗi file ≤ 50MB.** Số file: gom asset (atlas / sprite sheet) cho ít file — mỗi file tải lên một lượt. |
| Giao diện | Chạy trong khung cao ~78% màn hình, có nút Toàn màn hình (iframe cho phép `fullscreen; autoplay`). Thiết kế co giãn, dùng được trên điện thoại. |
| Âm thanh | Chỉ phát sau khi người dùng bấm (chính sách trình duyệt). |

## Bảo vệ nội dung (Ephata lo sẵn)
File bản build nằm ở kho **riêng tư**. Trang chơi chỉ cấp **mã truy cập** (ký, gắn với người chơi, hạn 12 giờ) cho người đã
có quyền; link không mã / mã giả / mã hết hạn đều bị chặn. App chạy trên domain riêng `play.ephatastore.com` trong khung có
`sandbox` → **không đọc được phiên đăng nhập của store** và không tự điều hướng được trang store (chỉ khi người dùng bấm).
App không cần làm gì thêm, miễn là dùng đường dẫn tương đối. Lưu ý: ảnh / âm thanh / video / wasm / font được chuyển hướng (302)
sang link ký của kho lưu trữ (domain khác, hạn 1 giờ) — vẽ ảnh lên `<canvas>` / WebGL thì đặt `img.crossOrigin = "anonymous"`;
`fetch()` asset không dùng `credentials: "include"`. Phiên mở quá 1 giờ mà tải asset mới thì nạp lại trang.

## Thu tiền theo lượt dùng — Ví Ephata
Bật ô **"App trừ point qua Ví Ephata"** trên admin. Người dùng được hỏi cho phép một lần khi mở công cụ. Gọi API bằng đường
dẫn tương đối từ trình duyệt — Ephata xác thực bằng **mã truy cập trong URL** (gắn đúng người chơi + đúng app, chỉ trừ được ví
của người đó cho app họ đã cho phép):

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
  // mời nạp point: <a href={r.topupUrl} target="_top">Nạp point</a>  (URL tuyệt đối tới trang Ví; target="_top" thoát khỏi khung)
}
```
Mã lỗi: `INSUFFICIENT_POINTS` (kèm `needed`, `balance`, `topupUrl`) · `CONNECTION_REVOKED` (người dùng đã ngắt kết nối, **hoặc
ô Ví chưa bật trên admin**, hoặc người dùng mở từ Giáo Lý Số mà chưa từng cho phép trên Ephata — mời mở từ trang sản phẩm trên
Ephata) · `TOKEN_INVALID` (phiên chơi hết hạn sau 12 giờ — mời mở lại từ Ephata) · `PRODUCT_NOT_FOUND` (phiên đang mở trên bản
build vừa bị thay — mời tải lại trang) · `IDEMPOTENCY_CONFLICT` · `BAD_REQUEST` · `NOT_SIGNED_IN` (chỉ gặp khi chạy local / preview).
Nên **báo trước giá** cho người dùng và trừ khi họ bấm xác nhận.

## Giá & quyền
- **Công cụ web**: **luôn miễn phí** cho người đã đăng nhập (admin chặn đặt PRO); doanh thu qua Ví Ephata (nếu bật).
- **Game miễn phí**: ai đăng nhập cũng chơi.
- **Game có phí**: mua 1 lần dùng vĩnh viễn (giá nhập bằng VND > 0, trả bằng point). **Full Topping** cũng chơi được. Ô **"Miễn phí
  cho Pro Giáo Lý Số"**: tick thì tài khoản Pro Giáo Lý Số chơi miễn phí **trong thời gian gói Pro còn hạn**; không tick thì ai cũng mua.
- Người dùng Pro có thể **thêm game vào Giáo Lý Số**: game chạy trong khung của Giáo Lý Số qua link nhúng ổn định (mã nhúng 365 ngày,
  mỗi lần mở cấp mã chơi 12 giờ và **kiểm lại quyền** — hết quyền thì link báo hết quyền). Thay bản build không làm gãy link này.

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Chạy trên store**.
2. Chọn **Game** hoặc **Công cụ web**, nhập tên, danh mục, (game) Tier + Giá mua vĩnh viễn + ô Pro, ô **trừ point qua Ví Ephata**
   (chỉ tick khi app có gọi `/charge`), mô tả ngắn, ảnh bìa, file `.zip`.
3. Bấm tải lên → Ephata kiểm file (tên, dung lượng) → tải từng file → chuyển sang trang sản phẩm. Slug tự tạo = tên + 6 ký tự ngẫu
   nhiên. **Sản phẩm hiện trên store ngay** sau khi tải lên.
4. Mở **Sửa** sản phẩm → dán **Mô tả chi tiết (HTML)** (xem `description.md`) → Lưu. Form tạo mới chỉ có mô tả ngắn.

**Phát hành bản mới**: mở **Sửa** sản phẩm → khung **Bản build** → chọn `.zip` mới → **Tải bản build mới**. Thay tại chỗ:
cùng sản phẩm, cùng slug, người đã mua giữ quyền, link Giáo Lý Số không gãy. Bản đang chạy được **giữ làm "bản trước"** — lỗi thì
bấm **↺ Quay lại bản trước**; chỉ bản cũ hơn nữa bị xóa. Đã có người dùng thì **không đổi được loại** (game ↔ công cụ).

## Kiểm sau khi lên
- Sản phẩm phải tick **Đang bán** + **Hiện trên store** thì trang chơi / API Ví mới chạy. Store đang bật Coming Soon thì kiểm
  bằng tài khoản admin.
- Mở trang sản phẩm → **Chơi ngay / Mở công cụ** → app chạy, ảnh/âm thanh tải đủ (DevTools không có lỗi 404).
- Bấm Toàn màn hình, thử trên điện thoại.
- Có Ví: chạy 1 lần dịch vụ có phí → số dư giảm đúng, lịch sử Ví ghi đúng lý do; thử thiếu point.
