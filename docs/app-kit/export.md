# Xuất bộ bàn giao (export) — làm khi chốt sản phẩm

Bước cuối của **mọi loại** sản phẩm. Kết quả là **một thư mục** chứa đủ mọi thứ để đưa lên Ephata (và Microsoft Store với
phần mềm loại 5): ảnh đúng kích thước, mô tả, thông tin điền form, file / bộ cài. Người đưa lên admin chỉ việc mở thư mục và
chọn file — không phải tự cắt ảnh hay đoán kích thước.

## 1. Cấu trúc thư mục

```
release/<slug>-<version>/            vd release/gelo-1.2.8/
├── ephata/                          ← mọi loại
│   ├── cover.jpg                    ảnh bìa 1600×900
│   ├── logo.png                     logo 512×512 (nên có)
│   ├── media/                       tối đa 4 minh họa, đặt tên theo thứ tự hiện: 01.png, 02.png, 03.mp4…
│   │   └── youtube.txt              (tùy chọn) mỗi dòng 1 link YouTube
│   ├── description.html             mô tả chi tiết (theo description.md)
│   └── listing.md                   thông tin điền form admin (mẫu ở mục 4)
├── privacy-policy.md                ← loại 5 (và app gửi dữ liệu qua mạng): chính sách quyền riêng tư → đăng tại
│                                       https://www.ephatastore.com/quyen-rieng-tu/<slug> trước khi nộp Store
├── deliverable/                     ← loại 1–4: thứ giao cho Ephata
│   └── …                            loại 1: file tải về · loại 2: build.zip · loại 3: url.txt · loại 4: feature-key.txt
├── installers/                      ← loại 5: bộ cài tải về
│   ├── <App>_<ver>_x64-setup.exe
│   └── <App>_<ver>_universal.dmg
└── msstore/                         ← loại 5, chỉ khi lên Microsoft Store
    ├── <App>_<ver>.msix
    ├── store-listing.md             mọi ô điền Partner Center (mẫu ở mục 5)
    ├── package-logos/               3 logo nằm TRONG gói .msix (đưa cho pack.ps1 -Logos)
    │   ├── StoreLogo.png            50×50
    │   ├── Square44x44Logo.png      44×44
    │   └── Square150x150Logo.png    150×150
    └── listing/                     ảnh tải lên Partner Center → Store listing (TẤT CẢ là .png)
        ├── screenshots/01.png…      1920×1080, 1–10 ảnh (bắt buộc ≥ 1)
        ├── poster-720x1080.png      Store logos · Poster art 2:3 (hoặc 1440×2160)
        ├── box-art-1080.png         Store logos · 1:1 Box art (hoặc 2160×2160)
        ├── app-tile-300.png         Store display images · 1:1 App tile icon 300×300
        ├── tile-150.png             Store display images · 1:1 150×150
        ├── tile-71.png              Store display images · 1:1 71×71
        └── hero-1920x1080.png       (tùy chọn) 16:9 Super hero art
```

Không commit thư mục `release/` (thêm vào `.gitignore`) — bộ cài và ảnh nặng.

## 2. Bảng kích thước chuẩn

### Ephata (mọi loại)

| File | Kích thước | Định dạng · dung lượng | Hiện ở đâu / lưu ý |
|---|---|---|---|
| **Ảnh bìa** `cover.jpg` | **1600×900** (16:9) | JPG / WebP / PNG · ≤ 5MB (nên ≤ 1MB) | Thẻ sản phẩm (nhỏ, ~300px ngang) + đầu trang sản phẩm. Hình và chữ chính đặt **ở giữa**, chữ đủ to để đọc ở cỡ nhỏ. Không đặt logo / chữ sát mép. |
| **Logo** `logo.png` | **512×512** vuông (tối thiểu 256) | PNG (nền trong suốt hoặc đặc) · ≤ 2MB | Cạnh tên sản phẩm. Logo ≠ ảnh bìa — đừng dùng ảnh bìa làm logo. |
| **Ảnh minh họa** `media/0N.png` | **1920×1080** (16:9) | PNG / JPG / WebP · ≤ 10MB | Ảnh chụp màn hình thật của sản phẩm, quan trọng nhất đặt đầu. Không chèn chữ quảng cáo đè lên. |
| **Video minh họa** `media/0N.mp4` | 1920×1080 hoặc 1280×720 | MP4 (H.264) / WebM · ≤ 50MB, nên ≤ 1 phút | Demo ngắn, không tiếng hoặc có phụ đề. Video dài → link YouTube (`youtube.txt`). |
| File tải về / bộ cài `.exe` `.dmg` | — | ≤ **50MB mỗi file** | Giới hạn hiện tại của Ephata. Quá → báo Felix. |
| `build.zip` (loại 2) | — | theo **từng file bên trong** | html / js / css / json < 4MB, ảnh / âm thanh / video ≤ 50MB — xem `types/hosted.md`. |

Tối đa **4** minh họa (ảnh + video + YouTube cộng lại).

### Microsoft Store (loại 5)

| File | Kích thước | Ghi chú |
|---|---|---|
| `package-logos/StoreLogo.png` | 50×50 PNG | Nằm trong gói .msix. Tauri: có sẵn trong `src-tauri/icons` sau `npx tauri icon`. |
| `package-logos/Square44x44Logo.png` | 44×44 PNG | Icon thanh tác vụ / menu Start. |
| `package-logos/Square150x150Logo.png` | 150×150 PNG | Ô Start. |
| `listing/screenshots/0N.png` | **1920×1080** PNG (tối thiểu 1366×768) | **Screenshots → Desktop**: bắt buộc ≥ 1, tối đa 10, **khuyên ≥ 4**; ≤ 50MB/ảnh; mỗi ảnh có chú thích ≤ 200 ký tự. Nội dung chính ở **2/3 trên** (Store có thể đè chữ lên 1/3 dưới). Không thêm logo / chữ quảng cáo. |
| `listing/poster-720x1080.png` | **720×1080** hoặc 1440×2160 PNG | **Store logos → Poster art** (Partner Center ghi "9:16" nhưng kích thước là 2:3). Bắt buộc nếu bán trên Xbox; app chỉ Windows thì tùy chọn nhưng **nên có** (Store dùng trong tìm kiếm / bộ sưu tập). Được có tên sản phẩm — đặt ở **2/3 trên**. |
| `listing/box-art-1080.png` | **1080×1080** hoặc 2160×2160 PNG | **Store logos → 1:1 Box art**. Như Poster: bắt buộc cho Xbox, nên có; tên sản phẩm (nếu có) ở 2/3 trên. |
| `listing/app-tile-300.png` | **300×300** PNG | **Store display images → 1:1 App tile icon** — "Displayed in the Store for Windows 10/11 customers". Microsoft khuyên mạnh; có thì Store dùng thay logo trong gói. |
| `listing/tile-150.png` | **150×150** PNG | **Store display images → 1:1** 150×150. |
| `listing/tile-71.png` | **71×71** PNG | **Store display images → 1:1** 71×71. Không có 3 ảnh vuông này thì Store dùng logo trong gói .msix. |
| `listing/hero-1920x1080.png` | 1920×1080 PNG (tùy chọn) | "16:9 Super hero art": **không có chữ**, không chụp giao diện app, nội dung chính ở giữa. Microsoft dặn **tránh biểu tượng tôn giáo** trong ảnh này — sản phẩm Công giáo nên dùng hình minh họa trung tính (hoặc bỏ qua ảnh này). |

**Mọi ảnh Microsoft Store đều phải là `.png`** (script kiểm). Danh sách ô theo màn hình Partner Center → Store listing (12/10/2026)
và Microsoft Learn "App screenshots, images, and trailers for MSIX app" — kiểm lại khi nộp, Microsoft có thể đổi.

### Ảnh gốc nên giữ trong dự án

| Ảnh gốc | Kích thước | Dùng để sinh |
|---|---|---|
| `art/cover.png` | ≥ 1600×900, đúng 16:9 | Ảnh bìa |
| `art/icon-1024.png` | **1024×1024** vuông, PNG | Logo Ephata, logo gói MSIX, app tile, icon app (`npx tauri icon art/icon-1024.png`; Electron: `build/icon.png`) |
| `art/screenshots/*.png` | chụp ở 1920×1080 (cửa sổ app phóng to trên màn Full HD) | Minh họa Ephata + ảnh chụp Microsoft Store |

## 3. Sinh ảnh + kiểm bằng script

Trước khi xuất: làm **Bước 0** trong `README.md` (kiểm kit mới nhất trên GitHub) — chuẩn kích thước / thư mục có thể đã đổi.

```bash
npm i -D sharp                       # 1 lần
node tools/app-kit/export/make-images.mjs build --out release/<slug>-<version> \
  --cover art/cover.png --icon art/icon-1024.png --shots art/screenshots [--msstore] [--bg "#0b0d10"] \
  [--poster art/poster.png] [--box art/box.png]
```
- Ảnh bìa: cắt giữa về đúng 1600×900 (ảnh gốc khác tỉ lệ → script cảnh báo, mở `cover.jpg` xem lại).
- Logo / logo Store (gói .msix + 3 ảnh vuông 300 / 150 / 71): đặt vừa khung vuông, nền trong suốt.
- Poster art 720×1080 + Box art 1080×1080 (khi có `--msstore`): dùng ảnh thiết kế riêng nếu truyền `--poster` / `--box` (cắt giữa
  đúng tỉ lệ); không truyền thì script **tự dựng tạm** từ icon trên nền `--bg` (icon ở 2/3 trên) và cảnh báo — nên thay bằng ảnh
  thiết kế có tên sản phẩm.
- Ảnh chụp: đặt vừa khung 1920×1080 **không cắt**, phần thừa tô màu `--bg`; 4 ảnh đầu (theo tên file) → `ephata/media/`,
  tối đa 10 → `msstore/listing/screenshots/` (khi có `--msstore`).
- Video, `hero-1920x1080.png`, `description.html`, `listing.md`, bộ cài / file giao: **tự đặt vào** đúng chỗ ở mục 1.

Trước khi đưa lên, **luôn chạy kiểm** — phải ra `✓ Bộ bàn giao hợp lệ`:
```bash
node tools/app-kit/export/make-images.mjs check release/<slug>-<version>
```
Kiểm: đúng kích thước từng ảnh, định dạng, dung lượng, ≤ 4 minh họa, đủ 3 logo gói MSIX, ảnh chụp Store là PNG ≥ 1366×768,
mỗi file tải lên Ephata ≤ 50MB, có `listing.md` + `description.html`. Có **LỖI** thì sửa; **CẢNH BÁO** thì đọc và tự quyết.

## 4. Mẫu `ephata/listing.md`

Điền sẵn đúng giá trị của sản phẩm — người đưa lên admin chép từng ô:

```markdown
# <Tên sản phẩm> — <version>

- Loại trên admin: <Tải về | Chạy trên store | Link ngoài | Tính năng Giáo Lý Số | Phần mềm cài đặt>
- Tiêu đề: …
- Slug: …            (loại 5: giống hệt PRODUCT trong app)
- Mô tả ngắn (≤ 140 ký tự): …
- Danh mục: …        (chính + phụ)
- Nhà phát hành: …
- Bán: Miễn phí | Mua vĩnh viễn <giá VND> | Thuê bao <giá VND/tháng> · Dùng thử <N ngày | không>
- Miễn phí cho Pro Giáo Lý Số: có | không
- Tags: …
- Ảnh: ephata/cover.jpg · ephata/logo.png · ephata/media/01..0N (+ youtube.txt)
- Mô tả chi tiết: dán ephata/description.html → bấm Xem trước
- Giao hàng: deliverable/… | installers/<file .exe> + <file .dmg>, phiên bản X.Y.Z, ghi chú phát hành: …
- Loại 5: Số thiết bị / key: <chọn trên admin> · Hạn dùng offline: <số ngày | vĩnh viễn> — CHỈ ghi ở đây, không ghi vào mô tả
- Microsoft Store (loại 5): msstore/<file .msix> — mọi ô Partner Center ở msstore/store-listing.md
```

## 5. Mẫu `msstore/store-listing.md` (loại 5, khi lên Microsoft Store)

Một file gom **mọi ô phải điền trên Partner Center**, người nộp chỉ việc chép. Ví dụ thật đã nộp:
`examples/store-listing-ephata-ebooks.md`. Giữ đúng tiêu đề và nhãn `**…**` + khối ``` bên dưới — `make-images.mjs check`
đọc file theo các nhãn này để kiểm giới hạn ký tự.

- **Mỗi ngôn ngữ gói `.msix` khai báo = một mục `## <Tên> (xx-XX)`** (vd `vi-VN`, `en-US`) — Partner Center bắt điền listing
  cho từng ngôn ngữ đó. Ảnh dùng chung, chú thích ảnh viết theo từng ngôn ngữ.
- **Không ghi số thiết bị / số ngày offline / giá** — viết "số máy theo khung giá trên trang sản phẩm" (trang tự hiện).
- Không HTML, không link trong Description (link để ở ô Website / Support / Privacy).

~~~markdown
# Microsoft Store listing — <Tên app> <version>

Chép từng ô vào Partner Center → <Tên app> → Submission → Store listings → <ngôn ngữ>.
Gói `.msix` khai <các ngôn ngữ> → điền đủ các mục ngôn ngữ bên dưới.

Ảnh (giống nhau mọi ngôn ngữ, tất cả .png):
- Screenshots (Desktop): `listing/screenshots/01.png … 0N.png`
- Store logos: `listing/poster-720x1080.png` · `listing/box-art-1080.png`
- Store display images: `listing/app-tile-300.png` · `listing/tile-150.png` · `listing/tile-71.png`
- 16:9 Super hero art (tùy chọn): `listing/hero-1920x1080.png`

---

## Tiếng Việt (vi-VN)

**Product name:** <tên đã reserve>

**Description** (≤ 10.000 ký tự, chữ thường — không HTML, không link)
```
<Đoạn mở 1–2 câu: là gì, cho ai.>

<Nhóm tính năng miễn phí — mỗi ý một dòng bắt đầu bằng •>

<Nhóm tính năng Pro (nếu có) + cách mua key trên Ephata Store và nhập key trong app; số máy theo khung giá trên trang sản phẩm.>
```

**What's new in this version** (≤ 1.500 ký tự — để trống ở lần nộp đầu)
```
<thay đổi của phiên bản>
```

**Product features** (tối đa 20 dòng, mỗi dòng ≤ 200 ký tự, không tự thêm dấu gạch đầu dòng)
```
<tính năng 1>
<tính năng 2>
```

**Short description** (≤ 1.000 ký tự, nên < 270; viết khác câu đầu của Description)
```
<1–2 câu>
```

**Search terms** (tối đa 7 cụm, mỗi cụm ≤ 30 ký tự — nếu Partner Center còn ô này)
```
<cụm 1>
<cụm 2>
```

**Screenshot captions** (mỗi chú thích ≤ 200 ký tự; số đầu dòng = số file ảnh)
```
01 <chú thích ảnh 01>
02 <chú thích ảnh 02>
```

**Additional system requirements** (Minimum — tối đa 11 dòng, mỗi dòng ≤ 200 ký tự)
```
Windows 10 phiên bản 1809 trở lên (64-bit)
Kết nối mạng khi kích hoạt key
```

---

## English (en-US)

<lặp lại đủ các nhãn như mục tiếng Việt, viết tiếng Anh>

---

## Ô dùng chung (không theo ngôn ngữ)

| Ô | Giá trị |
|---|---|
| Copyright and trademark info (≤ 200) | © <năm> ONETWENTYSIX VERSE |
| Developed by (≤ 255) | ONETWENTYSIX VERSE |
| Website | https://www.ephatastore.com/product/<slug> (phải mở được trước khi nộp) |
| Support contact info | https://www.ephatastore.com/lien-he |
| Privacy policy URL | https://www.ephatastore.com/quyen-rieng-tu/<slug> (đăng từ `privacy-policy.md` trước khi nộp) |
| Additional license terms | Để trống (dùng điều khoản mặc định của Microsoft) |
| Pricing | Free — key Pro bán trên Ephata (Store policy 10.8.x cho app không phải game; kiểm bản hiện hành trước khi nộp) |
| Category | <danh mục chính → phụ> |
| Age rating | Bảng hỏi IARC: <không bạo lực / không nội dung người lớn / không chat / dữ liệu cá nhân gì / mua ngoài app (key)> |

---

## Submission options (Partner Center → Submission → Submission options)

Viết tiếng Anh — người duyệt của Microsoft đọc, khách không thấy.

**Publishing hold options:** lần nộp đầu chọn "Don't publish this submission until I select Publish now" — duyệt xong kiểm
trang Store, dán link Store vào trang Sửa sản phẩm trên Ephata, rồi mới bấm Publish.

**Restricted capabilities → Why do you need the runFullTrust capability, and how will it be used in your product?** (≤ 500 ký tự, một đoạn)
```
<App> is a Win32 desktop app (<Tauri/Rust + WebView2 | Electron | Python>) packaged as MSIX with entry point
Windows.FullTrustApplication, so runFullTrust is needed for it to run. It is used only to <việc app làm với file / mạng>,
keep its data in its AppData folder and call www.ephatastore.com over HTTPS to activate a license.
No elevation, services, drivers or startup tasks.
```

**Notes for certification** (nên điền)
```
<Phần miễn phí thử thế nào, không cần tài khoản.>
Pro features require a license key sold on Ephata Store (www.ephatastore.com), a non-game app using third-party payment
as allowed by policy 10.8. To test Pro: <menu → License → paste key → Activate>. An internet connection is required for activation.
Test key: <KEY THỬ — tạo riêng cho người duyệt>
The user interface is in Vietnamese.
```
> Key thử: tạo / mua 1 key riêng cho người duyệt (đừng dùng key của khách), đủ suất thiết bị; duyệt xong thu hồi ở
> Admin → Người dùng. Không đưa key thì người duyệt chỉ thử được phần miễn phí và có thể từ chối.
~~~

`check` báo **lỗi** khi vượt giới hạn ký tự / số dòng, thiếu Description ở một ngôn ngữ, số chú thích nhiều hơn số ảnh, hoặc
lời giải trình runFullTrust quá 500 ký tự; **cảnh báo** khi còn chỗ `<…>` chưa điền, Short description dài hơn 270 ký tự,
thấy số thiết bị / số ngày offline viết cứng, hoặc thiếu `privacy-policy.md`.

## 6. Bàn giao

Gửi người đưa lên admin cả thư mục `release/<slug>-<version>/` (nén zip nếu gửi qua mạng) kèm kết quả lệnh `check`.
Thứ tự với loại 5 lên Microsoft Store: **đưa lên Ephata trước** (Đang bán + Hiện) → đăng trang chính sách `…/quyen-rieng-tu/<slug>`
→ tạo key thử → mới nộp Partner Center (người duyệt mở link Website / Privacy và cần key để thử bản Pro).
Sau khi lên: làm mục "Kiểm sau khi lên" của loại sản phẩm (`types/<loại>.md`).
