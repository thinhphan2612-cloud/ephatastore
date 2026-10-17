# Loại 5 — Phần mềm cài đặt (bán key)

App desktop Windows / macOS: khách **tải miễn phí**, **mua key** bằng point trên Ephata để mở bản Pro.
Store luôn ghi phần mềm là **"Bản miễn phí"** (+ nhãn **"Bản Pro"** khi có bán key) → **bản không key phải dùng được thật**
(chức năng cơ bản), key chỉ mở thêm phần Pro, mua 1 lần dùng vĩnh viễn.
Có thể phát hành thêm qua **Microsoft Store**. Đường dẫn file trong tài liệu này tính từ thư mục kit
(`tools/app-kit/` khi đã đặt vào repo app).

File dùng cho loại này: `license/` (module kích hoạt), `ci/` (workflow build), `msstore/` (đóng gói Store).

**Mức kiểm chứng (2026-10-11):**
- 3 module license (Rust / Node / Python): đã chạy thật với API production Ephata. Đã thử kích hoạt, mở lại app, refresh,
  kiểm bản mới và hủy kích hoạt; module Node thử thêm thu hồi key và vượt số thiết bị.
- `ci/tauri-release.yml` (job release): đã build thật ra `.exe` + `.dmg` cho Gelo 1.2.8.
- `msstore/pack.ps1`: đã đóng gói thật ra `.msix`. Chưa nộp Store lần nào.
- `ci/electron-release.yml`, job `msstore` trong workflow, phần Python build: **chưa chạy thật** — lần đầu theo dõi kỹ.

---

## 0. Trước khi bắt đầu — tự chốt 3 thứ

Bạn đăng nhập admin Ephata bằng tài khoản admin được cấp và tự đưa app lên. Chốt trước khi code:

1. **Slug sản phẩm** (vd `lich-phung-vu`): chữ thường không dấu, số, gạch ngang; không trùng sản phẩm đã có
   (admin báo "Slug đã tồn tại" nếu trùng). Slug này vừa là `PRODUCT` trong app vừa là slug khi tạo sản phẩm trên admin —
   **hai nơi phải giống hệt nhau** và **không đổi sau khi đã bán key** (đổi là mọi key đã bán hỏng).
   Key sinh ra có tiền tố = 4 ký tự đầu slug viết hoa (`LICH-XXXX-XXXX-XXXX`) — chọn slug có 4 chữ đầu dễ nhận.
2. **Giá key** (VND, 100đ = 1 point; mua 1 lần dùng vĩnh viễn; **không bao giờ** miễn phí cho Pro Giáo Lý Số / Full Topping),
   **số thiết bị / key** (chọn theo từng sản phẩm — đổi sau chỉ áp cho key bán sau đó; khách tự gỡ máy cũ ở Thư viện
   1 lần / 30 ngày / key — đây là quy tắc chung của hệ thống),
   **hạn dùng offline** (chọn số ngày theo từng sản phẩm — app không có mạng quá số ngày này thì phải bật mạng để xác minh lại;
   hoặc tick **Vĩnh viễn**: kích hoạt 1 lần dùng mãi, nhưng thu hồi key / gỡ thiết bị chỉ có hiệu lực khi app có mạng lại).
   **Không ghi số thiết bị / số ngày offline vào mô tả, listing hay Store listing** — trang sản phẩm tự hiện "N thiết bị" theo
   cấu hình admin; viết cứng thì sai ngay khi admin đổi cấu hình. Cần nhắc thì viết "số máy theo khung giá".
3. **Tài khoản Microsoft Partner Center** dùng để nộp Store (nếu app lên Store): hỏi Felix dùng tài khoản chung nào.

Thu hồi: admin bấm **Thu hồi** quyền phần mềm của một khách (Admin → Người dùng) → key bị **khóa** (`LICENSE_REVOKED`), app về
trạng thái `revoked` ở lần kiểm tiếp theo; admin **Cấp lại** → key mở lại, khách không phải nhập key mới.

---

## 1. Gắn license vào app (làm 1 lần / app)

### 1.1 Chọn module theo stack

| Stack | File | Mức chống bẻ |
|---|---|---|
| Tauri / Rust | `license/rust/ephata_license.rs` | Cao — logic nằm trong binary biên dịch. **Khuyên dùng cho app mới.** |
| Electron | `license/node/ephata-license.js` (chỉ ở **main process**) | Thấp — giải nén asar sửa JS được. Thêm bytenode/obfuscator; chấp nhận rủi ro. |
| Python | `license/python/ephata_license.py` | Thấp nếu PyInstaller; khá hơn nếu build **Nuitka**. |

Mỗi file có hướng dẫn cài phụ thuộc + cách dùng ở đầu file. Chỉ cần đặt:
- `PRODUCT` = slug của bạn.
- (Rust) `APP_DIR_NAME`, `KEYRING_SERVICE` — tên riêng cho app; (Python) `app_name`.
- `PUBLIC_KEY` và `API_BASE` đã điền sẵn — **không sửa**.

### 1.2 Quy tắc bắt buộc

1. **Chặn chức năng Pro ở lớp lõi**: Rust `require_pro()`, Node `isPro()` ở main process, Python `is_pro()` trong logic.
   UI chỉ hiển thị. Ẩn nút ở UI không phải là chặn.
2. **Mở app**: đọc `current()` (chạy offline), rồi gọi `refresh()` **ngầm 1 lần / phiên** (không chặn UI, lỗi mạng thì bỏ qua).
3. **Màn hình Bản quyền** trong app (đặt **đúng tên "Bản quyền"** — trang sản phẩm hướng dẫn khách "mở app → mục Bản quyền →
   dán key → Kích hoạt") có: trạng thái Free/Pro, ô nhập key + nút Kích hoạt, key đã che (`••••-ABCD`),
   hạn offline, nút **Hủy kích hoạt** (để khách chuyển máy), nút **Mua key** → mở `store_page_url` trong trình duyệt.
4. **Dịch mã lỗi** ra câu dễ hiểu:

   | Mã | Gợi ý câu hiển thị |
   |---|---|
   | `LICENSE_NOT_FOUND` | Key không đúng. Kiểm tra lại (key ở Thư viện trên Ephata). |
   | `LICENSE_REVOKED` | Key đã bị thu hồi. Liên hệ hỗ trợ Ephata. |
   | `DEVICE_LIMIT` | Key đã dùng đủ số máy. Hủy kích hoạt ở máy cũ, hoặc gỡ máy cũ ở **Thư viện trên Ephata** (1 lần / 30 ngày / key), rồi thử lại. |
   | `PRODUCT_MISMATCH` | Key này của sản phẩm khác. |
   | `NETWORK_ERROR` | Không kết nối được. Kiểm tra mạng. |
   | `SERVER_ERROR` / `TOKEN_INVALID` / `TOKEN_MALFORMED` / `BAD_REQUEST` | Máy chủ phản hồi không hợp lệ. Thử lại sau (lặp lại → báo nhà phát hành). |
   | `KEY_EMPTY` | Nhập key trước khi kích hoạt. |

   Trạng thái sau `refresh()` (thư viện client trả về, không ném lỗi):

   | `status` | Ý nghĩa | Gợi ý câu hiển thị |
   |---|---|---|
   | `revoked` | Key bị thu hồi (vd hoàn tiền / vi phạm) | Bản quyền đã bị thu hồi. Liên hệ hỗ trợ Ephata. |
   | `removed` | Máy này đã bị **gỡ khỏi key** (khách tự gỡ ở Thư viện, hoặc hủy kích hoạt từ máy khác) | Máy này chưa được kích hoạt. Nhập lại key để dùng tiếp. |

   **Đừng** hiện "key bị thu hồi" cho `removed` — khách chỉ vừa đổi máy.

5. **Trạng thái `needs_verify`** (quá hạn offline): coi là CHƯA Pro, nhắc người dùng bật mạng; app tự refresh lần mở sau.
   **Hạn offline vĩnh viễn**: server ký `offlineExpiresAt` lùi ~100 năm — nếu `offlineUntil` cách hiện tại hơn 50 năm,
   hiển thị "Vĩnh viễn" thay vì ngày cụ thể.
6. **Kiểm bản mới**: `check_update()` lúc mở app → có bản mới thì hỏi người dùng → mở `store_page_url`.
   **Bản Microsoft Store KHÔNG gọi** (Store tự cập nhật) — tắt bằng cờ build (mục 5.2).

### 1.3 Hợp đồng API (tham khảo — module đã làm sẵn)

Base `https://www.ephatastore.com/api/software/v1`, JSON vào/ra. Lỗi nghiệp vụ: HTTP 200 `{ok:false, error}`.

| Gọi | Body | Trả |
|---|---|---|
| `POST /licenses/activate` | `{product, key, deviceId, platform, appVersion}` | `{ok, licenseToken}` |
| `POST /licenses/refresh` | `{product, licenseToken, deviceId, appVersion}` | `{ok, licenseToken}` |
| `POST /licenses/deactivate` | `{product, licenseToken, deviceId}` | `{ok}` |
| `GET /products/<slug>/latest?platform=windows\|macos` | — | `{ok, version, notes, publishedAt, pageUrl}` |

Token = `base64url(payload).base64url(chữ ký Ed25519 trên chuỗi payload base64)`. Payload
`{product, key, deviceId, plan:"pro", features, issuedAt, offlineExpiresAt}`. App chỉ coi là Pro khi:
chữ ký đúng + `product` = slug + `deviceId` = máy này + `plan` = `"pro"` + chưa quá `offlineExpiresAt`.

---

## 2. Version — 1 số cho mọi nơi

- Semver `X.Y.Z`, tăng ở **mọi** file khai báo version:
  Tauri: `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` ·
  Electron: `package.json` · Python: chỗ app đọc version.
- Tag git `vX.Y.Z` trùng. Khi upload lên Ephata nhập đúng `X.Y.Z`.
- Bản Microsoft Store: `X.Y.Z.0` (Store bắt buộc số cuối = 0) — `pack.ps1` tự thêm.

---

## 3. Build bộ cài `.exe` + `.dmg`

- Không ký số. Khách Windows gặp "Windows protected your PC" → **More info → Run anyway**.
  Khách macOS: **System Settings → Privacy & Security → Open Anyway** (ghi vào mô tả sản phẩm).
- **`.dmg` chỉ build được trên máy Mac** → dùng GitHub Actions (runner macOS miễn phí phút theo gói GitHub).
- Ephata nhận tối đa **50MB / file**.

### 3.1 Tauri — dùng `ci/tauri-release.yml`

1. Chép `ci/tauri-release.yml` → `.github/workflows/release.yml`.
2. `package.json` thêm script: `"tauri": "tauri"`.
3. `src-tauri/tauri.conf.json`: `"bundle": { "macOS": { "signingIdentity": "-" } }`. Không bật updater của Tauri.
4. Phát hành:
   ```bash
   git tag -a v1.0.0 -m "1.0.0"
   ```
   ```bash
   git push origin v1.0.0
   ```
5. ~10 phút sau: GitHub → Releases → bản **nháp** có `<Tên>_1.0.0_x64-setup.exe` và `<Tên>_1.0.0_universal.dmg`. Tải về.

Build `.exe` tại máy Windows (không cần CI): `npx tauri build --bundles nsis`
→ `src-tauri/target/release/bundle/nsis/`.

Build sai, cần chạy lại cùng version: xóa tag rồi đặt lại vào commit mới
(`git tag -d v1.0.0`, `git push origin :refs/tags/v1.0.0`, rồi tag + push lại). **Đã upload bản đó lên Ephata** thì Ephata từ chối
upload lại cùng số phiên bản ("Đã có bản 1.0.0 cho windows") — xóa bản đó ở **Lịch sử phiên bản** trên trang Sửa trước (hoặc tăng
version, vd 1.0.1). Xóa bản đang phát hành: khách tải / app kiểm cập nhật chuyển sang bản trước đó.

### 3.2 Electron — dùng `ci/electron-release.yml`
Tag như trên → tab **Actions** → lần chạy → mục **Artifacts** tải `windows-installer`, `macos-installer`.
Electron thường 80–150MB → **vượt 50MB**: báo Felix trước (phương án: Windows chỉ phát hành qua Microsoft Store).
Nếu app mở trên Mac báo "bị hỏng": ký ad-hoc `.app` trước khi tạo dmg: `codesign --force --deep -s - "<App>.app"`.

### 3.3 Python — tự dựng theo mẫu Electron (chưa có template)
- Đóng app: Nuitka `python -m nuitka --standalone --windows-console-mode=disable app.py` (khuyên dùng)
  hoặc PyInstaller `pyinstaller --onedir --windowed app.py`.
- Windows: bọc thư mục output bằng **Inno Setup** (`iscc setup.iss`) → `Setup_<ver>.exe`.
- macOS (trên Mac/runner macOS): `.app` rồi
  `hdiutil create -volname "<App>" -srcfolder "dist/<App>.app" -ov -format UDZO "<App>_<ver>.dmg"`.
  Universal cần Python universal2; mặc định runner Apple Silicon chỉ ra arm64.
- CI: chép cấu trúc `ci/electron-release.yml` (1 job Windows + 1 job macOS + upload-artifact), thay lệnh build.

### 3.4 Kiểm bộ cài trước khi upload (bắt buộc)
Cài trên máy sạch (hoặc máy ảo) → mở app → màn hình Bản quyền hiện Free → nút Mua mở đúng trang
`https://www.ephatastore.com/product/<slug>` → (sau khi lên Ephata) kích hoạt key thật.

---

## 4. Upload lên Ephata

Chuẩn bị trước bằng **`export.md`**: thư mục `release/<slug>-<version>/` có ảnh đúng kích thước, `installers/`
(.exe + .dmg ≤ 50MB), `msstore/` (nếu lên Store) — chạy `make-images.mjs check` ra ✓ rồi mới upload.

1. Đăng nhập bằng tài khoản admin được cấp → **Admin** → **Thêm sản phẩm** → **Phần mềm cài đặt (bán key)**.
2. Điền: tiêu đề, **slug = `PRODUCT` trong app** (gõ tay, đừng để trống cho tự tạo; sai → mọi key báo `PRODUCT_MISMATCH`), mô tả (ghi cả hướng dẫn
   "Open Anyway / Run anyway"), danh mục, nhà phát hành, ảnh bìa, **logo app** (icon vuông của app) + tối đa **4 ảnh / video minh
   họa** (ảnh chụp app, video demo ngắn hoặc link YouTube — README "Quy ước chung"), giá key, số thiết bị/key, hạn offline.
   Trang sản phẩm tự hiện nút tải theo hệ điều hành của khách kèm tên file + dung lượng, nên đặt tên file bộ cài rõ ràng
   (vd `Gelo_1.2.8_x64-setup.exe`).
3. Khung **Bộ cài & phân phối**: phiên bản `X.Y.Z`, ghi chú phát hành, file `.exe` (cột Windows), file `.dmg` (cột macOS),
   link Microsoft Store (để trống nếu chưa lên Store). Bấm **Lưu** — chờ thanh tiến trình tải xong.
4. Bản sau: mở trang **Sửa** sản phẩm → nhập phiên bản mới + chọn file mới → Lưu. Bản cũ còn trong Lịch sử phiên bản.
5. Kiểm (thay `<slug>`):
   ```bash
   curl -s "https://www.ephatastore.com/api/software/v1/products/<slug>/latest?platform=windows"
   ```
   Phải trả `"ok":true` và đúng version vừa upload. Làm tương tự với `platform=macos`.
6. Mua 1 key bằng tài khoản thật → **Thư viện** hiện key → nhập vào app đã cài → lên Pro.

---

## 5. Microsoft Store (MSIX)

### 5.1 Chuẩn bị 1 lần / app
1. Tài khoản **Partner Center** (developer) — phí/thủ tục Microsoft đổi vài lần, kiểm trên Partner Center.
2. **Reserve tên app** → **Product management → Product identity** lấy 3 giá trị (khớp từng ký tự):
   `Package/Identity/Name`, `Package/Identity/Publisher` (`CN=…`), `Package/Properties/PublisherDisplayName`.
3. Store **tự ký lại gói** khi duyệt → không cần mua chứng thư.
4. Chuẩn bị **`msstore/store-listing.md`** (mẫu ở `export.md` mục 5, ví dụ thật `examples/store-listing-ephata-ebooks.md`):
   mô tả từng ngôn ngữ, từ khóa, chú thích ảnh, ô dùng chung, lời giải trình runFullTrust, ghi chú cho người duyệt + key thử.
   **Chính sách quyền riêng tư** (`privacy-policy.md` ở gốc bộ bàn giao) phải được đăng thành URL công khai
   `https://www.ephatastore.com/quyen-rieng-tu/<slug>` **trước khi nộp** — gửi file cho Felix để đăng. Ảnh theo **`export.md`**
   (`msstore/listing/`, **tất cả .png**: 1–10 ảnh chụp 1920×1080 kèm chú thích; Store logos: Poster art 720×1080 + Box art
   1080×1080; Store display images: 300×300 / 150×150 / 71×71; hero 1920×1080 tùy chọn — không chữ,
   tránh biểu tượng tôn giáo theo hướng dẫn của Microsoft).
5. Thanh toán: app không phải game được dùng thanh toán bên thứ ba (key mua trên Ephata) theo Store policy 10.8.x —
   **kiểm lại bản hiện hành trước khi nộp**. Đặt giá trên Store là Free.

### 5.2 Bản Store = 1 bản build riêng (cờ build)
- **Tắt** kiểm bản mới / nút tải bản mới.
- **Tự khởi động** (nếu app có): registry `Run` bị MSIX ảo hóa → dùng `StartupTask` (khối Extensions trong
  `AppxManifest.template.xml`, `TaskId="AppStartup"`), code bật/tắt qua WinRT `Windows.ApplicationModel.StartupTask`.
  App không tự khởi động → xóa khối Extensions.
- Thư mục cài **chỉ đọc** — không ghi file cạnh exe; dữ liệu ghi vào AppData.
- Dữ liệu AppData của bản Store tách riêng theo gói → người chuyển từ bản `.exe` sang bản Store không thấy dữ liệu cũ
  (key vẫn dùng được; mỗi bản tính 1 thiết bị).
- License không đổi — mua key vẫn trên Ephata.

Cách làm cờ: Tauri → Cargo feature `msstore` (`[features] msstore = []`, code dùng `cfg!(feature = "msstore")`),
build `npx tauri build --features msstore --no-bundle`. Electron → biến môi trường lúc build hoặc
`process.windowsStore` (Electron tự đặt `true` khi chạy trong gói Store). Python → hằng số build riêng.

### 5.3 Đóng gói
**Tauri / Python (exe hoặc thư mục):** cần Windows SDK (có `makeappx.exe`).
```powershell
./tools/app-kit/msstore/pack.ps1 -Source src-tauri/target/release/myapp.exe -Exe myapp.exe -Logos src-tauri/icons -Version 1.0.0 -DisplayName 'My App' -Description 'Mô tả ngắn' -IdentityName '<Package/Identity/Name>' -Publisher '<CN=...>' -PublisherDisplayName '<Tên NPH>' -Out MyApp.msix
```
`-Source` nhận file exe (Tauri) hoặc thư mục (Nuitka/PyInstaller `--onedir`). `-Logos` là thư mục có
`StoreLogo.png` (50×50), `Square44x44Logo.png` (44×44), `Square150x150Logo.png` (150×150) — Tauri có sẵn trong
`src-tauri/icons`; hoặc dùng `release/<slug>-<version>/msstore/package-logos` do `make-images.mjs build --msstore` sinh.
Hoặc để CI làm: job `msstore` trong `ci/tauri-release.yml` (đặt 3 Repository variables `MSSTORE_*`; sửa `myapp.exe` cho đúng tên exe;
đường dẫn script mặc định `./tools/app-kit/msstore/pack.ps1` — đổi nếu đặt kit chỗ khác).

**Electron:** khối `appx` trong cấu hình electron-builder:
`"appx": { "identityName": "...", "publisher": "CN=...", "publisherDisplayName": "...", "applicationId": "..." }`,
chạy `npx electron-builder --win appx` (hoặc job `msstore` trong `ci/electron-release.yml`).

### 5.4 Thử trước khi nộp
Bật **Developer Mode** (Settings → System → For developers), cài từ thư mục layout mà `pack.ps1` in ra:
```powershell
Add-AppxPackage -Register <layout>\AppxManifest.xml
```
Kiểm: mở app, kích hoạt key, (nếu có) bật tự khởi động rồi khởi động lại máy, không hiện thông báo bản mới.
Gỡ: `Get-AppxPackage *<Tên>* | Remove-AppxPackage`.

### 5.5 Nộp & nối về Ephata
**Trước khi nộp** (người duyệt của Microsoft sẽ mở các link): sản phẩm đã **live trên Ephata** (Đang bán + Hiện,
`https://www.ephatastore.com/product/<slug>` mở được) và trang chính sách `…/quyen-rieng-tu/<slug>` mở được; có **key thử**
riêng cho người duyệt: **Admin → Sản phẩm → Sửa → khung "Key tặng / key thử"** (key rời, không gắn tài khoản, không trừ point;
duyệt xong bấm **Khóa**). Khung này cũng dùng để tặng key cho thành viên / đối tác (nhập email → key hiện ở Thư viện của họ).

Partner Center → app → **Submission**: Packages (upload `.msix`) → Properties → Age ratings → Store listings (chép từ
`store-listing.md`) → Submission options (giữ, chưa phát hành ở lần đầu + runFullTrust + Notes for certification) → Submit.
Duyệt xong có link `https://apps.microsoft.com/detail/<StoreID>` → dán vào ô **Link Microsoft Store** ở trang Sửa
sản phẩm trên admin → Lưu. Nút Windows trên Ephata tự chuyển sang mở Store, `.exe` thành link dự phòng.

---

## 6. Checklist mỗi lần phát hành

- [ ] `PRODUCT` trong app giống hệt slug sản phẩm trên admin. `PUBLIC_KEY`, `API_BASE` giữ nguyên như trong kit.
- [ ] Chức năng Pro chặn ở lớp lõi; mở app có refresh ngầm; màn hình Bản quyền đủ nút (mục 1.2).
- [ ] Version tăng ở mọi file + tag `vX.Y.Z` trùng.
- [ ] Bản thường bật kiểm bản mới; bản Store tắt.
- [ ] `.exe` và `.dmg` ≤ 50MB, đã cài thử trên máy sạch.
- [ ] Bộ bàn giao `release/<slug>-<version>/` theo `export.md`; `make-images.mjs check` ra ✓.
- [ ] Upload lên Ephata đúng version; `curl …/latest` ra version mới cho cả windows và macos.
- [ ] Mua key thật → kích hoạt → tắt mạng mở lại app vẫn Pro → Hủy kích hoạt → máy khác kích hoạt được.
- [ ] Bản Store: thử `Add-AppxPackage -Register` trước khi nộp.

## 7. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| App báo "Máy chủ phản hồi không hợp lệ" (`SERVER_ERROR`) | Server trả HTML thay vì JSON — thường do sai `API_BASE` hoặc API chưa triển khai ở production. Thử `curl …/public-key` phải ra JSON. |
| Mọi key báo `PRODUCT_MISMATCH` | `PRODUCT` trong app ≠ slug trên Ephata. |
| Kích hoạt xong báo `TOKEN_INVALID` | `PUBLIC_KEY` trong app sai (còn khóa cũ/khóa test). Lấy đúng giá trị trong kit hoặc `curl …/public-key`. |
| `latest` trả `NO_RELEASE` | Chưa upload bộ cài cho nền tảng đó trên Ephata, sai slug, hoặc sản phẩm chưa tick **Đang bán** / **Hiện trên store**. |
| Upload bộ cài báo "Đã có bản X cho …" | Trùng số phiên bản — xóa bản đó ở Lịch sử phiên bản hoặc tăng version. |
| Admin không cho tick "Đang bán" | Phần mềm cần ít nhất 1 bộ cài hoặc link Microsoft Store. |
| Khách báo app hiện "chưa kích hoạt" sau khi đổi máy | Bình thường (`removed`): khách đã gỡ máy cũ ở Thư viện — nhập lại key trên máy đang dùng. |
| CI Tauri: `Missing script: "tauri"` | Thiếu script `"tauri": "tauri"` trong package.json. |
| CI Tauri: `failed to import keychain certificate` | Có khai báo `APPLE_*` trong env workflow mà không có chứng thư → xóa. |
| CI Tauri: `Resource not accessible by integration` | Thiếu `permissions: contents: write` trong workflow. |
| Upload lên Ephata báo vượt 50MB | Bộ cài quá lớn — báo Felix. |
