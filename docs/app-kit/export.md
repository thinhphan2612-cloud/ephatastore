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
├── deliverable/                     ← loại 1–4: thứ giao cho Ephata
│   └── …                            loại 1: file tải về · loại 2: build.zip · loại 3: url.txt · loại 4: feature-key.txt
├── installers/                      ← loại 5: bộ cài tải về
│   ├── <App>_<ver>_x64-setup.exe
│   └── <App>_<ver>_universal.dmg
└── msstore/                         ← loại 5, chỉ khi lên Microsoft Store
    ├── <App>_<ver>.msix
    ├── package-logos/               3 logo nằm TRONG gói .msix (đưa cho pack.ps1 -Logos)
    │   ├── StoreLogo.png            50×50
    │   ├── Square44x44Logo.png      44×44
    │   └── Square150x150Logo.png    150×150
    └── listing/                     ảnh tải lên Partner Center → Store listing
        ├── app-tile-300.png         300×300
        ├── screenshots/01.png…      1920×1080 PNG, 1–10 ảnh
        └── hero-1920x1080.png       (tùy chọn) 1920×1080
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
| `listing/app-tile-300.png` | **300×300** PNG | **1:1 App tile icon** — Microsoft khuyên mạnh; có thì Store ưu tiên dùng thay logo trong gói. |
| `listing/screenshots/0N.png` | **1920×1080** PNG (tối thiểu 1366×768) | Bắt buộc ≥ 1, tối đa 10, **khuyên ≥ 4**; ≤ 50MB/ảnh; mỗi ảnh có chú thích ≤ 200 ký tự. Nội dung chính ở **2/3 trên** (Store có thể đè chữ lên 1/3 dưới). Không thêm logo / chữ quảng cáo. |
| `listing/hero-1920x1080.png` | 1920×1080 PNG (tùy chọn) | "16:9 Super hero art": **không có chữ**, không chụp giao diện app, nội dung chính ở giữa. Microsoft dặn **tránh biểu tượng tôn giáo** trong ảnh này — sản phẩm Công giáo nên dùng hình minh họa trung tính (hoặc bỏ qua ảnh này). |

2:3 Poster art và 1:1 Box art chỉ dành cho **game** / Xbox — app không cần. Nguồn: Microsoft Learn "App screenshots, images,
and trailers for MSIX app" (kiểm lại khi nộp, Microsoft có thể đổi).

### Ảnh gốc nên giữ trong dự án

| Ảnh gốc | Kích thước | Dùng để sinh |
|---|---|---|
| `art/cover.png` | ≥ 1600×900, đúng 16:9 | Ảnh bìa |
| `art/icon-1024.png` | **1024×1024** vuông, PNG | Logo Ephata, logo gói MSIX, app tile, icon app (`npx tauri icon art/icon-1024.png`; Electron: `build/icon.png`) |
| `art/screenshots/*.png` | chụp ở 1920×1080 (cửa sổ app phóng to trên màn Full HD) | Minh họa Ephata + ảnh chụp Microsoft Store |

## 3. Sinh ảnh + kiểm bằng script

```bash
npm i -D sharp                       # 1 lần
node tools/app-kit/export/make-images.mjs build --out release/<slug>-<version> \
  --cover art/cover.png --icon art/icon-1024.png --shots art/screenshots [--msstore] [--bg "#0b0d10"]
```
- Ảnh bìa: cắt giữa về đúng 1600×900 (ảnh gốc khác tỉ lệ → script cảnh báo, mở `cover.jpg` xem lại).
- Logo / logo Store: đặt vừa khung vuông, nền trong suốt.
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
- Microsoft Store (loại 5): msstore/<file .msix>; chú thích ảnh chụp: 01 …, 02 …
```

## 5. Bàn giao

Gửi người đưa lên admin cả thư mục `release/<slug>-<version>/` (nén zip nếu gửi qua mạng) kèm kết quả lệnh `check`.
Sau khi lên: làm mục "Kiểm sau khi lên" của loại sản phẩm (`types/<loại>.md`).
