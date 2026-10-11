# Mô tả chi tiết sản phẩm (HTML)

Áp dụng cho **mọi loại sản phẩm**. Ô **"Mô tả chi tiết (HTML)"** trên form admin nhận mã HTML, hiển thị ở mục
"Giới thiệu" của trang sản phẩm. Ephata **lọc HTML phía server** trước khi lưu và trước khi hiển thị: chỉ giữ thẻ trình
bày, phần còn lại tự bị loại (không báo lỗi). Viết đúng quy tắc dưới đây để không mất nội dung và **không làm vỡ
layout trang trên điện thoại**.

## Viết gì (cấu trúc gợi ý)
1. **Đoạn mở** 2–3 câu: sản phẩm là gì, giúp ai, giải quyết việc gì.
2. **Tính năng chính**: danh sách 4–7 ý, mỗi ý một dòng, bắt đầu bằng động từ.
3. **Dành cho ai / dùng khi nào**.
4. **Cần gì để dùng**: trình duyệt / hệ điều hành / tài khoản Giáo Lý Số…
5. (Tùy chọn) Ảnh chụp màn hình, video YouTube hướng dẫn, bảng so sánh gói, câu hỏi thường gặp.

Tiêu đề trong mô tả bắt đầu từ **`<h2>`** — trang đã có `<h1>` là tên sản phẩm (`<h1>` tự đổi thành `<h2>`).
Dòng **tagline** (≤ 140 ký tự) là ô riêng, không lặp lại trong mô tả.

## Được dùng
| Nhóm | Thẻ / thuộc tính |
|---|---|
| Chữ | `h2` `h3` `h4` `p` `br` `hr` `strong` `b` `em` `i` `u` `s` `mark` `small` `sub` `sup` `blockquote` `code` `pre` `span` `div` |
| Danh sách | `ul` `ol` (`start`) `li` |
| Link | `a href="https://…"` hoặc `mailto:` — Ephata tự thêm mở tab mới + `rel="noopener noreferrer nofollow"` |
| Ảnh | `img src="https://…" alt="…"` — **URL https đầy đủ** (đường dẫn tương đối bị loại); `figure` + `figcaption` |
| Bảng | `table` `thead` `tbody` `tfoot` `tr` `th` `td` (`colspan` `rowspan`) `caption` |
| Video | **chỉ YouTube embed**: `<iframe src="https://www.youtube.com/embed/<ID>">` hoặc `youtube-nocookie.com/embed/<ID>` |
| `style` (mọi thẻ) | **chỉ**: `color`, `background-color`, `text-align`, `font-weight`, `font-style`, `text-decoration` |

## Tự bị loại (đừng dùng)
- `<script>`, mọi thuộc tính sự kiện (`onclick`, `onerror`…), link `javascript:` / `data:`.
- `<style>`, `<link>`, `<meta>`, `<head>`, `<body>`, `<html>` — **chỉ dán phần nội dung**, không dán cả trang HTML.
- `class` và `id` — CSS của bạn không đi kèm; giao diện lấy theo theme của store (tự đổi sáng / tối).
- `<form>`, `<input>`, `<button>`, `<svg>`, `<object>`, `<embed>`, `<canvas>`, `<video>`, `<audio>`.
- `iframe` không phải YouTube embed (Google Maps, Facebook, link `youtube.com/watch?v=`…).
- Ảnh/link `http://` (không s) hoặc bắt đầu bằng `//`.
- `style` ngoài danh sách trên: `width`, `height`, `margin`, `padding`, `position`, `font-size`, `display`, `float`…

## Giữ trang không vỡ (responsive)
Mục Giới thiệu nằm trong khung nền rộng hết trang, nội dung là **cột giữa rộng tối đa 880px** (~290px trên điện thoại);
ảnh/video tối đa 800px, ảnh/video/bảng tự căn giữa. Ephata đã ép ảnh/video/bảng vừa khung, nhưng vẫn:
- **Ảnh**: dùng ảnh chụp màn hình / minh họa bên trong sản phẩm — **đừng lặp lại ảnh bìa** (đã hiện ở đầu trang).
  Rộng tối thiểu 1200px để nét, tỉ lệ ngang (16:9 hoặc 4:3); nén WebP/JPG ≤ 300KB mỗi ảnh. Luôn có `alt`.
  Ảnh tự co theo khung — đừng đặt `width` cố định để "ép" kích thước.
- **Video YouTube**: dán đúng link embed (`Chia sẻ → Nhúng`, lấy phần `src`). Khung tự theo tỉ lệ 16:9, rộng 100%.
- **Bảng**: tối đa 4 cột, nội dung ô ngắn. Trên điện thoại vừa khoảng **3 cột**; nhiều hơn thì bảng cuộn ngang trong
  chính nó (trang không vỡ, nhưng khó đọc) — nhiều thông tin thì tách thành danh sách.
- **Không** dùng bảng để dàn layout nhiều cột, **không** dùng `&nbsp;` hay nhiều `<br>` để căn chỉnh khoảng cách.
- Link dài, mã dài tự xuống dòng; khối `<pre>` cuộn ngang trong khung.
- Màu chữ (`color`) phải đọc được trên **cả nền tối và nền sáng** — tốt nhất không đặt màu, dùng `<strong>` / `<mark>`
  để nhấn mạnh (tự theo theme).

## Mẫu
```html
<p><strong>Rung Chuông Vàng</strong> là game show giáo lý chạy ngay trên trình duyệt — có màn hình điều khiển cho
người dẫn và màn hình trình chiếu cho cả lớp.</p>

<h2>Tính năng</h2>
<ul>
  <li>Soạn bộ câu hỏi theo lớp giáo lý, hoặc dùng bộ có sẵn</li>
  <li>Đếm giờ, tính điểm, loại người chơi tự động</li>
  <li>Trình chiếu toàn màn hình trên máy chiếu / TV</li>
</ul>

<h2>Dành cho ai</h2>
<p>Giáo lý viên, huynh trưởng, ban mục vụ thiếu nhi tổ chức sinh hoạt hoặc thi đố giáo lý.</p>

<figure>
  <img src="https://example.com/rcv-man-hinh.webp" alt="Màn hình điều khiển Rung Chuông Vàng">
  <figcaption>Màn hình điều khiển của người dẫn</figcaption>
</figure>

<h2>Video hướng dẫn</h2>
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Hướng dẫn Rung Chuông Vàng" allowfullscreen></iframe>

<h2>Cần gì để dùng</h2>
<p>Máy tính có Chrome / Edge / Safari bản mới. Không cần cài đặt.</p>
```

Mẫu thật đã qua bộ lọc: [`examples/mo-ta-ai-la-trieu-phu.html`](examples/mo-ta-ai-la-trieu-phu.html) (game Ai là triệu phú Giáo lý).

## Kiểm trước khi lưu
1. Bấm tab **Xem trước** trong form — đó là đúng HTML sau khi lọc. Thứ gì không thấy ở đây là đã bị loại.
2. Lưu → mở trang sản phẩm, thu hẹp cửa sổ (hoặc mở trên điện thoại): không có thanh cuộn ngang ở cả trang,
   ảnh/video không tràn, chữ đọc được ở cả giao diện sáng và tối (nút ☀ trên thanh đầu trang).
3. Ảnh/video đều tải được (không ô trống, không lỗi trong DevTools).

Ảnh trong mô tả phải là URL `https` công khai — Ephata **chưa có** ô tải ảnh riêng cho mô tả (ảnh bìa là ô khác).
