# Phần mềm bán key trên Ephata — Spec nền tảng

> Chốt 2026-10-11 (Felix). Ephata là **nơi cấp phép duy nhất** cho mọi phần mềm desktop bán trên store.
> Đưa sản phẩm mới lên = thao tác trong admin, **không cần code phía Ephata**. Mỗi app chỉ cần gắn
> module kiểm tra license **một lần** khi phát triển (Rust / Node / Python — xem mục 6).
> Hệ này thay thế `gelo-license-server` (chưa từng deploy, không có dữ liệu cần chuyển).

## 1. Trải nghiệm

**Admin** — `/admin/products/new` → loại thứ 5 **"Phần mềm cài đặt (bán key)"**:
- Thông tin chung như sản phẩm khác (tên, slug, mô tả, ảnh, danh mục) + **giá key (VND → point)**,
  **số thiết bị/key** (mặc định 2), **hạn offline** (mặc định 30 ngày),
  **link Microsoft Store** (`https://apps.microsoft.com/detail/<StoreID>`, để trống nếu chưa lên Store).
- Tab **Phiên bản**: upload bộ cài theo nền tảng (`windows` / `macos`) + số phiên bản (semver) + ghi chú.
  Bản mới nhất của mỗi nền tảng là bản khách tải. Bản cũ giữ lại (tải được qua link riêng nếu cần).
- Hiện sẵn **đoạn cấu hình** để dev dán vào app: `product slug`, `API base`, `public key`.
- Trang quản lý key: tìm theo key/email, thu hồi key, xóa thiết bị (hỗ trợ khách đổi máy), cấp key tặng.

**Khách** — trang `/product/<slug>`:
- Nút tải (miễn phí, không cần đăng nhập) — **luôn hiện cả 2**, chỉ làm nổi bật nút của hệ điều hành đang dùng
  (đoán qua user-agent; không ẩn nút theo user-agent vì dễ đoán sai):
  - **Windows** → mở Microsoft Store (`ms_store_url`). Ngay dưới có link nhỏ
    *"Không dùng được Store? Tải .exe"* → `/dl/<slug>/windows` (máy công ty / Windows LTSC chặn Store).
    Chưa có `ms_store_url` → nút Windows tải `.exe` trực tiếp.
  - **macOS** → `/dl/<slug>/macos` (tải `.dmg` như cũ).
  - Nền tảng chưa có bộ cài/link → nút mờ "Sắp có".
- Nút **Mua key — N point**. Mua xong: key hiện ở `/library` + hướng dẫn kích hoạt.
- Mỗi tài khoản 1 key/sản phẩm; đã có key thì nút đổi thành "Xem key".

**App** — "Mua" mở `https://ephatastore.com/product/<slug>`; có bản mới → nút "Tải bản mới" mở cùng trang đó.

## 2. Luật giá

- Phần mềm (`type = 'software'`) là **mua vĩnh viễn một lần**, giá = `price_month` (point = VND/100, như hiện tại).
- **Không** áp "Pro Giáo Lý Số → miễn phí" và **không** nằm trong gói topping — ai cũng trả point.
  Lý do: key vĩnh viễn; nếu Pro được free thì user lấy key mãi mãi kể cả khi hết Pro.
  `canAccessProduct` / `confirmPurchase` phải loại trừ `software` khỏi 2 nhánh này.

## 3. Dữ liệu (Supabase store)

```sql
-- 0013a: TÁCH RIÊNG — Postgres không cho dùng giá trị enum mới trong cùng transaction với ADD VALUE.
alter type product_type add value if not exists 'software';

-- 0013b
alter table products add column if not exists license_device_limit int not null default 2;
alter table products add column if not exists license_offline_days int not null default 30;
alter table products add column if not exists ms_store_url text;   -- null = chưa lên Microsoft Store

create table if not exists software_releases (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  platform     text not null check (platform in ('windows','macos')),
  version      text not null,                 -- semver "1.2.8"
  storage_path text not null,                 -- bucket PRIVATE 'product-files'
  file_name    text not null,
  size_bytes   bigint,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  unique (product_id, platform, version)
);

create table if not exists licenses (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete restrict,
  key           text not null unique,         -- "<PREFIX>-XXXX-XXXX-XXXX"
  store_user_id uuid,                         -- null = key tặng/cấp tay
  status        text not null default 'active' check (status in ('active','revoked')),
  device_limit  int not null,
  note          text,
  created_at    timestamptz not null default now(),
  unique (product_id, store_user_id)          -- 1 key / user / sản phẩm → mua idempotent
);

create table if not exists license_devices (
  id          uuid primary key default gen_random_uuid(),
  license_id  uuid not null references licenses(id) on delete cascade,
  device_id   text not null,
  platform    text,
  app_version text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (license_id, device_id)
);
-- RLS bật, không policy: chỉ service_role (server) đọc/ghi — giống các bảng nhạy cảm hiện có.
```

Key: tiền tố = 4 ký tự đầu slug viết hoa (vd `GELO-…`), 3 nhóm 4 ký tự từ bảng `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
(bỏ 0/O/1/I). Sinh bằng `crypto.randomBytes`, thử lại khi đụng unique.

## 4. Mua → cấp key

Trong `confirmPurchase`, nhánh `software`:
1. Đã có `licenses(product_id, store_user_id)` → không trừ point, về `/library`.
2. Trừ point (`adjustPoints`, như hiện tại) → insert `licenses` (`on conflict (product_id, store_user_id) do nothing`)
   → insert `entitlements` (`perpetual`, `expires_at = null`).
3. Bấm 2 lần / request song song: unique constraint chặn key thứ 2. **Phải đảm bảo không trừ point 2 lần** —
   gói bước 1–2 trong một RPC Postgres (`purchase_software(user, product)`, SECURITY DEFINER, khóa hàng ví
   như `adjust_points`) để trừ point và tạo key là một transaction.

## 5. API cho app (public, không cần đăng nhập)

Base: `https://ephatastore.com/api/software/v1`. JSON vào/ra. Lỗi: `{ "ok": false, "error": "<CODE>" }`, HTTP 200
cho lỗi nghiệp vụ (app hiển thị theo mã), 400 cho body sai, 405 sai method.

| Endpoint | Body | Trả về |
|---|---|---|
| `POST /licenses/activate` | `{ product, key, deviceId, platform, appVersion }` | `{ ok, licenseToken }` |
| `POST /licenses/refresh` | `{ product, licenseToken, deviceId, appVersion }` | `{ ok, licenseToken }` |
| `POST /licenses/deactivate` | `{ product, licenseToken, deviceId }` | `{ ok }` |
| `GET /products/<slug>/latest?platform=windows\|macos` | — | `{ ok, version, notes, publishedAt, pageUrl }` (`ok:false, error:"NO_RELEASE"` nếu chưa có bản) |
| `GET /public-key` | — | `{ ok, publicKey }` (base64 Ed25519 32 byte) |

Mã lỗi: `LICENSE_NOT_FOUND`, `LICENSE_REVOKED`, `DEVICE_LIMIT`, `PRODUCT_MISMATCH` (key thuộc sản phẩm khác),
`TOKEN_MALFORMED`, `BAD_REQUEST`.

Quy tắc server:
- activate: key tồn tại + đúng `product` + `active`; thiết bị mới thì đếm `license_devices` < `device_limit`.
- refresh: thiết bị phải đã đăng ký; không cần verify chữ ký token cũ (chỉ đọc key từ payload) — quyền quyết định
  nằm ở DB. Cấp token mới = gia hạn cửa sổ offline.
- **Token**: `base64url(payloadJSON) + "." + base64url(ed25519_sign(payloadB64))`. Payload:
  ```json
  { "product": "gelo", "key": "GELO-…", "deviceId": "…", "plan": "pro",
    "features": [], "issuedAt": 0, "offlineExpiresAt": 0 }
  ```
  (thời gian = epoch ms; `features` để trống trừ khi sản phẩm cần — Gelo hiện chỉ xét `plan == "pro"`.)
- Khóa ký: **một** cặp Ed25519 cho toàn store. Private key ở env Vercel `SOFTWARE_LICENSE_SIGNING_JWK`
  (server-only, KHÔNG `NEXT_PUBLIC_`). Public key nhúng vào mọi app. App **bắt buộc kiểm `product` == slug của mình**
  — đó là thứ ngăn key Gelo mở app khác.

Tải bộ cài: `GET /dl/<slug>/<platform>` (route thường, không cần đăng nhập) → tìm release mới nhất →
`createSignedUrl` (bucket private, hạn ngắn) → 302. Có `?version=` để tải bản cũ.

## 6. Module phía app (dùng lại cho mọi sản phẩm)

Ba bản cùng hành vi: lưu token an toàn, device id ngẫu nhiên lưu local, verify chữ ký + `product` + `deviceId` + hạn offline,
refresh ngầm khi mở app, check bản mới.

| Nền tảng | Module | Mức chống bẻ |
|---|---|---|
| Tauri / Rust | `license.rs` (tách từ Gelo) | Cao — code biên dịch. |
| Electron / Node | module JS chạy ở **main process** (không ở renderer) | Thấp — asar giải nén được, sửa JS là bỏ qua check. Nên kèm bytenode/obfuscate; chấp nhận rủi ro. |
| Python (exe) | module Python + `cryptography` | Thấp với PyInstaller (dịch ngược được); khá hơn nếu build bằng **Nuitka**. |

Mọi bản chỉ cấu hình 3 hằng: `PRODUCT`, `API_BASE`, `PUBLIC_KEY`.

**Bản Microsoft Store (MSIX)** của mỗi app: Store tự cập nhật → app **không** gọi `/latest` và không hiện "Tải bản mới"
(Gelo: cờ build `msstore`). Trong MSIX, ghi registry `Run` bị ảo hóa → tự khởi động phải dùng `StartupTask`
khai báo trong manifest. License/key không đổi: Store chỉ là kênh phát hành; mua key vẫn trên Ephata
(chính sách Store 10.8.1 cho app không phải game dùng thanh toán bên thứ ba — kiểm lại bản hiện hành trước khi nộp).
Đóng gói: Tauri/Python → `makeappx` (hoặc MSIX Packaging Tool), Electron → electron-builder target `appx`.

## 7. Bẫy

- **`src/proxy.ts` (Coming Soon)**: phải bỏ qua `/api/software/*` và `/dl/*`, nếu không app không kích hoạt được
  khi Production đang bật `COMING_SOON`. Cũng không cần refresh session Supabase cho các route này.
- **Upload bộ cài**: Vercel giới hạn body function ~4.5MB → upload **thẳng từ trình duyệt lên Storage**
  bằng `createSignedUploadUrl`, server chỉ ghi `software_releases`.
- **Giới hạn file Supabase**: gói Free tối đa **50MB/file**. Tauri (~5–15MB) ổn; **Electron thường 80–150MB → vượt**.
  Bản Windows đã có Store gánh; vẫn vướng với `.dmg` và `.exe` dự phòng → cần gói Pro Supabase hoặc nơi lưu khác.
- Cập nhật pha 1 chỉ báo có bản mới; tự cập nhật ngầm (Tauri updater) để pha 2 — khi đó cần thêm file `.sig`
  + endpoint updater.
- Không ký số (Authenticode/Apple) — khách gặp cảnh báo khi cài; macOS: System Settings → Privacy & Security → Open Anyway.
