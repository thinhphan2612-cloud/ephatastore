# Ephata App Kit — tạo sản phẩm cho Ephata Store

**Kit v16 · cập nhật 16/10/2026** — số phiên bản ở dòng này; thay đổi từng bản xem mục "Phiên bản kit" cuối file.

Bộ chuẩn để làm **bất kỳ sản phẩm nào** bán trên Ephata Store (chợ sản phẩm số Công giáo, ephatastore.com).
Mở một phiên code mới với AI → đưa kit này vào → AI hỏi ý tưởng, xác định sản phẩm thuộc loại nào trong 5 loại,
rồi làm theo đúng hướng dẫn của loại đó.

```
app-kit/
├── README.md            ← BẮT ĐẦU Ở ĐÂY (phỏng vấn ý tưởng + chọn loại)
├── PROMPT.md            ← đoạn dán cho AI để bắt đầu
├── description.md       ← mô tả chi tiết sản phẩm bằng HTML (mọi loại)
├── export.md            ← xuất bộ bàn giao khi chốt: ảnh đúng kích thước + file / bộ cài (mọi loại)
├── export/make-images.mjs ← script sinh bộ ảnh chuẩn + kiểm thư mục bàn giao
├── examples/            ← mẫu thật: mô tả HTML (Ai là triệu phú), store-listing Microsoft Store (EPHATA ebooks)
├── types/
│   ├── download.md      ← Loại 1: Tải về
│   ├── hosted.md        ← Loại 2: Chạy trên store (game / công cụ web)
│   ├── link.md          ← Loại 3: Link ngoài
│   ├── feature.md       ← Loại 4: Tính năng Giáo Lý Số
│   └── software.md      ← Loại 5: Phần mềm cài đặt (bán key)
├── license/             ← module kích hoạt key (chỉ loại 5)
├── ci/                  ← workflow build .exe/.dmg (chỉ loại 5)
└── msstore/             ← đóng gói Microsoft Store (chỉ loại 5)
```

---

## Hướng dẫn cho AI (đọc trước khi làm gì khác)

Bạn đang giúp một thành viên team Ephata tạo sản phẩm. Làm theo đúng thứ tự:

### Bước 0 — Dùng kit mới nhất
Kit trong `tools/app-kit/` là bản chụp lúc tải, **không tự cập nhật**. Mỗi khi mở phiên làm việc mới cho dự án này và
**trước khi xuất bộ bàn giao** (`export.md`): tải
`https://raw.githubusercontent.com/thinhphan2612-cloud/ephatastore/dev/docs/app-kit/README.md`,
so số "Kit vN" (dòng thứ 3) với `tools/app-kit/README.md`. Bản trên GitHub mới hơn → tải lại **toàn bộ** kit (nguyên văn, giữ cấu trúc —
danh sách file ở `PROMPT.md`), rồi tóm tắt cho người làm các mục mới trong "Phiên bản kit" và việc nào của dự án cần làm lại.

### Bước 1 — Phỏng vấn ý tưởng
Hỏi người tạo (gom thành **một lượt hỏi**, đừng hỏi từng câu):
1. Sản phẩm là gì, giải quyết việc gì, cho ai dùng (giáo xứ, giáo lý viên, giáo dân, thiếu nhi…)?
2. Người dùng **nhận một file** để mở bằng phần mềm có sẵn, hay **dùng một ứng dụng/trò chơi**?
3. Nếu là ứng dụng: chạy **trong trình duyệt** được không, hay cần **cài vào máy** (chạy nền, offline, truy cập file/hệ thống)?
4. Có cần **server / database / tài khoản riêng** (lưu dữ liệu dùng chung nhiều người) không?
5. Có phải là **chức năng bên trong app Giáo Lý Số** (dùng dữ liệu giáo xứ có sẵn ở đó) không?
6. Bán **miễn phí**, **mua 1 lần** hay **thuê bao**? Có **tính phí theo lượt dùng dịch vụ** (trừ point Ví Ephata) không?
   Tài khoản Pro Giáo Lý Số có được dùng free không? Đã có code/bản build sẵn chưa, stack gì?

### Bước 2 — Chọn loại (theo cây quyết định, dừng ở câu "có" đầu tiên)

| Câu hỏi | Có → Loại |
|---|---|
| Là chức năng **bên trong Giáo Lý Số**? | **4 · Tính năng Giáo Lý Số** → `types/feature.md` |
| Người dùng nhận **một file** (PDF, DOCX, ảnh, bộ thiết kế)? | **1 · Tải về** → `types/download.md` |
| Phải **cài vào máy** (Windows/macOS, chạy nền, offline, truy cập hệ thống)? | **5 · Phần mềm bán key** → `types/software.md` |
| Cần **server/database/tài khoản riêng**, hoặc app đã chạy ở domain khác? | **3 · Link ngoài** → `types/link.md` |
| Còn lại: chạy hoàn toàn trong trình duyệt (game, công cụ web, công cụ thu phí theo lượt) | **2 · Chạy trên store** → `types/hosted.md` |

Khi phân vân giữa **2** và **3**: nếu chỉ cần lưu dữ liệu trên máy người dùng (localStorage) thì chọn **2** —
Ephata lo hosting, bảo vệ file, thu tiền. Chọn **3** khi thật sự cần server (dữ liệu dùng chung, tích hợp dịch vụ khác,
khóa API bí mật). Cả hai đều **trừ point theo lượt dùng qua Ví Ephata** được (`charge` / `refund`).

### Bước 3 — Xác nhận
Báo lại cho người tạo: **loại đã chọn + lý do 1–2 câu + sản phẩm cuối cùng phải giao cho Ephata là gì**
(file gì, định dạng gì, giới hạn gì — lấy từ mục "Sản phẩm giao cho Ephata" và "Yêu cầu kỹ thuật" của loại đó).
Chờ người tạo đồng ý rồi mới làm.

### Bước 4 — Làm theo hướng dẫn của loại
Đọc toàn bộ `types/<loại>.md` và làm theo. Nêu plan ngắn + cách kiểm từng bước trước khi code.
Không commit / push / tạo tag khi chưa hỏi. Báo kết quả kiểm thật, không đoán.

### Bước 5 — Xuất bộ bàn giao + bàn giao
Làm theo **`export.md`**: xuất thư mục `release/<slug>-<version>/` (ảnh đúng kích thước Ephata + Microsoft Store,
`description.html`, `listing.md`, file / bộ cài) và chạy `make-images.mjs check` đến khi ra **✓ hợp lệ**.
Kết thúc bằng **checklist đưa lên admin** của loại đó (mục "Đưa lên admin" + "Kiểm sau khi lên"), điền sẵn giá trị cụ thể
của sản phẩm này (tiêu đề, slug gợi ý, mô tả ngắn, danh mục gợi ý, giá, file cần upload) và **mã HTML mô tả chi tiết**
soạn theo `description.md` (đã tự kiểm theo mục "Được dùng" / "Giữ trang không vỡ").

---

## So sánh nhanh 5 loại

| | 1 Tải về | 2 Chạy trên store | 3 Link ngoài | 4 Tính năng GLS | 5 Phần mềm bán key |
|---|---|---|---|---|---|
| Giao cho Ephata | 1 file | 1 file `.zip` bản build | 1 URL HTTPS | Feature key | `.exe` + `.dmg` (+ `.msix`) |
| Ai host | Ephata | Ephata | Bạn | Giáo Lý Số | Ephata (bộ cài) |
| Cách bán | Free / mua vĩnh viễn | Game: free / mua vĩnh viễn · Công cụ: luôn free | Free / thuê bao | Free / thuê bao (quyền **theo giáo xứ**) | Mua key vĩnh viễn |
| Trừ point theo lượt (Ví Ephata) | — | Có (gọi từ trình duyệt) | Có (server gọi, khóa bí mật) | — | — |
| Miễn phí cho Pro Giáo Lý Số (khi gói Pro còn hạn) | Tùy ô tick | Tùy ô tick (game) | Tùy ô tick | Tùy ô tick | **Không bao giờ** |
| Full Topping mở được | Có | Có (game có phí) | Có | **Không** | **Không** |
| Ephata chặn người chưa mua | Có (link tải ký 24h) | Có (file riêng tư + mã truy cập theo người chơi) | Có (launch token + `verify`) | Có (bật cho giáo xứ qua `provision`) | Có (key + chữ ký) |
| Mục trên admin | Tải về | Chạy trên store | Link ngoài | Tính năng Giáo Lý Số | Phần mềm cài đặt |

---

## Quy ước chung mọi loại

- **Admin**: `https://www.ephatastore.com/login` → đăng nhập tài khoản admin → **Admin → Thêm sản phẩm** → chọn đúng thẻ loại.
  (Store đã mở cho khách — sản phẩm bật **Đang bán** + **Hiện trên store** là khách thấy và mua được ngay.)
- **Tiền**: giá nhập bằng VND ở khung **Bán** của form (Miễn phí / Mua vĩnh viễn / Thuê bao tùy loại), người mua trả bằng
  **point** (100đ = 1 point), nạp point bằng chuyển khoản ở trang Ví. Ô **"Miễn phí cho Pro Giáo Lý Số"** quyết định tài khoản
  Pro có được dùng free không — không tick thì Pro vẫn phải mua. "Free cho Pro" chỉ **trong thời gian gói Pro của giáo xứ còn hạn**
  (không phải vĩnh viễn). **Full Topping** (thuê bao 365 ngày của khách) mở mọi sản phẩm có phí **trừ** phần mềm bán key và tính năng
  Giáo Lý Số — viết mô tả cho đúng điều này.
- **Đang bán + Hiện trên store**: sản phẩm chỉ hiện và mua được khi bật **cả hai** ô. Tắt "Đang bán" = gỡ hẳn (người đã mua cũng
  không mở được game / công cụ / app); tắt "Hiện trên store" = ẩn khỏi danh mục, người đã mua vẫn dùng. Admin **không cho bật
  Đang bán** khi chưa có thứ để giao (file tải về / URL app / feature key / bộ cài phần mềm).
- **Đã có người dùng thì khóa**: slug, **loại sản phẩm** và **feature key** không đổi được (muốn bán loại khác → tạo sản phẩm mới).
- **Hai người cùng sửa một sản phẩm**: người lưu sau bằng form mở từ trước bị chặn ("vừa được người khác sửa") — tải lại trang rồi sửa.
- **Slug**: chữ thường không dấu, số, gạch ngang; không trùng; **không đổi sau khi đã bán**.
- **Nổi bật / Mới**: admin bật ở trang **Sửa** sản phẩm. Sản phẩm Nổi bật có nhãn **★ Nổi bật** trên thẻ và đứng đầu khi khách
  sắp xếp "Nổi bật" (mặc định ở trang chủ / danh mục); kế đến là sản phẩm Mới, rồi theo ngày phát hành.
- **Ảnh bìa**: **1600×900** (16:9), JPG/WebP/PNG ≤ 5MB (nên ≤ 1MB). Hiện ở thẻ sản phẩm (~300px ngang) và đầu trang sản phẩm —
  hình + chữ chính đặt ở giữa, chữ đủ to để đọc ở cỡ nhỏ. Ảnh khác tỉ lệ sẽ bị cắt.
- **Logo ứng dụng** (tùy chọn, nên có): ảnh **vuông 512×512** (tối thiểu 256), PNG/JPG/WebP, ≤ 2MB — hiện ở card thông tin trang sản phẩm; không có thì
  dùng icon mặc định. Logo ≠ ảnh bìa (đừng dùng ảnh bìa 16:9 làm logo).
- **Ảnh / video minh họa** (tùy chọn, tối đa **4**): hiện sau ảnh bìa ở khung lớn + hàng thumbnail trên trang sản phẩm.
  Ảnh chụp màn hình **1920×1080** (16:9) PNG/JPG/WebP/GIF ≤ 10MB; video **MP4/WebM ≤ 50MB, nên ≤ 1 phút** (demo ngắn, không tiếng hoặc có
  phụ đề); video dài / hướng dẫn chi tiết → **link YouTube** (dán link vào ô, Ephata chỉ nạp video khi khách bấm). Thứ tự: thứ quan
  trọng nhất đặt đầu. Không chèn chữ quảng cáo đè lên ảnh chụp màn hình.
- **Mô tả**: dòng tagline ngắn (≤ 140 ký tự) + mô tả chi tiết **bằng HTML** theo `description.md`: làm được gì, cho ai,
  cần gì để dùng. Chỉ dùng thẻ trong danh sách cho phép — phần khác tự bị loại; bấm **Xem trước** trên form trước khi lưu.
  Tối đa 100.000 ký tự (quá thì form báo lỗi). Trang sản phẩm chỉ hiện ~360px đầu kèm nút "Xem thêm" → đặt thông tin chính lên đầu.
- **Tiếng Việt có dấu** trong nội dung; tên file và slug **không dấu**.
- **Nội dung Công giáo**: chính xác giáo lý, ghi nguồn; bản dịch Kinh Thánh, sách lễ, thánh ca thường có bản quyền.
- **Mua thử**: dùng tài khoản admin nạp point và mua thật để kiểm từ đầu đến cuối.

---

## Phiên bản kit

- **v16 (16/10/2026)** — Ví Ephata: API **`state`** (JSON ≤ 16KB theo người dùng, lưu phía server) cho lượt miễn phí / tiến độ —
  đừng đếm lượt miễn phí bằng `localStorage` (tab ẩn danh là lách được); gửi lại khóa của lần trừ **đã hoàn hết** = trừ mới;
  thêm mã lỗi `WALLET_DISABLED` cho app host; nhận biết đang chạy trên Ephata bằng đường dẫn `/g/<id>/<mã>/`, không bằng tên miền.
  Dự án loại 2 / 3 có lượt miễn phí: chuyển phần đếm sang `state`.
- **v15 (12/10/2026)** — key thử cho người duyệt Microsoft Store: tạo ở **Admin → Sửa phần mềm → "Key tặng / key thử"** (key rời,
  không trừ point, Khóa / Gỡ thiết bị sau khi duyệt); cùng khung dùng để tặng key cho thành viên theo email.
- **v14 (12/10/2026)** — mẫu **`msstore/store-listing.md`** (mọi ô Partner Center theo từng ngôn ngữ, ô dùng chung, runFullTrust,
  ghi chú cho người duyệt + key thử) + ví dụ thật `examples/store-listing-ephata-ebooks.md`; **`privacy-policy.md`** đăng tại
  `/quyen-rieng-tu/<slug>` trước khi nộp; thứ tự nộp Store (lên Ephata trước). **Không ghi số thiết bị / số ngày offline** vào mô tả
  hay listing (trang tự hiện theo cấu hình admin). `check` kiểm giới hạn ký tự của `store-listing.md`. Dự án loại 5 đang làm: soạn
  `store-listing.md` + `privacy-policy.md`, bỏ số thiết bị / ngày khỏi `description.html`, chạy lại `check`.
- **v13 (12/10/2026)** — ảnh Microsoft Store theo đúng màn hình Partner Center: thêm **Poster art 720×1080** + **Box art 1080×1080**
  (Store logos) và **150×150 / 71×71** (Store display images, cùng 300×300); tất cả là PNG. `make-images.mjs` sinh + kiểm các ảnh này
  (`--poster` / `--box` cho ảnh thiết kế riêng). Dự án loại 5 đã xuất bộ bàn giao: chạy lại `build --msstore` rồi `check`.
- **v12 (12/10/2026)** — thêm số phiên bản + **Bước 0** (AI tự kiểm và tải lại kit mới); mục "Nổi bật / Mới"; sửa hướng dẫn
  nút giao diện (menu Theo máy / Sáng / Tối) trong `description.md`; bỏ ghi chú "store đang Coming Soon" (store đã mở).
- **v11 (12/10/2026)** — thêm `export.md` + `export/make-images.mjs`: xuất bộ bàn giao `release/<slug>-<version>/`, chuẩn kích thước
  ảnh Ephata (bìa 1600×900, logo 512×512, minh họa 1920×1080) và Microsoft Store; thẻ sản phẩm hiện ảnh bìa đúng 16:9.
