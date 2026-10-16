# Loại 3 — Link ngoài

Web app **đã host ở nơi khác** (có server, database, tài khoản riêng). Ephata bán quyền dùng, chuyển người dùng sang app kèm
**launch token** để app nhận diện họ, và (tùy chọn) cho app **trừ point theo lượt dùng qua Ví Ephata**.
Trên admin chọn thẻ **Link ngoài**, loại **Công cụ**.

## Dùng khi
- App cần **server / database / tài khoản riêng**: quản lý giáo xứ, sổ sách, đăng ký sự kiện, dữ liệu dùng chung nhiều người.
- App đã chạy sẵn trên domain riêng (Vercel, VPS…).
- App tính phí theo dịch vụ (mỗi lần xuất file, gửi tin, xử lý…) bằng point của người dùng.

Không phải loại này nếu: app chạy được hoàn toàn trong trình duyệt (→ Chạy trên store — Ephata lo hosting, bảo vệ, thu tiền).

## Luồng
```
Người dùng bấm "Dùng ngay" trên Ephata
 → /launch/<sản phẩm>: Ephata kiểm quyền (đã mua / free / Full Topping / Pro GLS còn hạn nếu sản phẩm gắn nhãn)
 → (app bật Ví) lần đầu: màn hình "Cho phép app dùng Ví Ephata?"
 → chuyển sang APP_URL?ephata_token=<token>      (ký Ed25519, hạn 5 phút)
 → server app gọi POST /connect (khóa bí mật)    → nhận user + mã kết nối dài hạn
 → server app dùng mã kết nối để: verify quyền / balance / charge / refund
```
**Quan trọng — mã kết nối xoay vòng:** mỗi lần `/connect` (mỗi lần người dùng mở app từ Ephata, ở bất kỳ máy / trình duyệt nào)
Ephata cấp **mã kết nối MỚI và vô hiệu mã cũ** của người đó với app. Vì vậy:
- Lưu `connection` **trong DB, theo `c.user.id`** (ghi đè mỗi lần connect) — **không** giữ trong session / cookie.
- Mỗi lần gọi verify / balance / charge: **đọc mã mới nhất từ DB**. Giữ mã cũ trong session → máy thứ nhất nhận `CONNECTION_REVOKED`
  ngay khi người dùng mở app ở máy thứ hai.

## Cấu hình (lấy ở trang Sửa sản phẩm trên admin, khung "Kết nối app ngoài")
| Biến (server của app) | Giá trị |
|---|---|
| `EPHATA_PRODUCT` | slug sản phẩm |
| `EPHATA_API_BASE` | `https://www.ephatastore.com/api/apps/v1` |
| `EPHATA_APP_SECRET` | khóa bí mật — bấm **Tạo khóa bí mật**; **chỉ hiện một lần**, lưu ngay vào biến môi trường server. Tạo khóa mới = khóa cũ hết hiệu lực. **Không bao giờ** đặt trong code trình duyệt. |
| `EPHATA_PUBLIC_KEY` | khóa công khai Ed25519 (nếu muốn tự kiểm chữ ký launch token — không bắt buộc; **không thay được `/connect`**, vẫn cần gọi để lấy mã kết nối) |

Launch token = `base64url(payload).base64url(chữ ký Ed25519 trên chuỗi payload)` (cùng định dạng token bản quyền phần mềm).
Payload: `{ typ:"ephata-launch", product, sub (id người dùng), email, access:{active,until}, wallet, iat, exp (ms), jti }`. Hạn 5 phút;
token có thể dùng lại trong 5 phút đó — app nên bỏ token khỏi URL ngay sau khi connect.

## API (server app gọi; header `Authorization: Bearer <EPHATA_APP_SECRET>`; JSON vào/ra)
| Endpoint | Body | Trả về |
|---|---|---|
| `POST /connect` | `{ product, launchToken }` | `{ ok, user:{id,email}, connection, access:{active,until} }` |
| `POST /verify` | `{ product, connection }` | `{ ok, user:{id}, access:{active,until} }` — quyền **hiện tại** |
| `POST /balance` | `{ product, connection }` | `{ ok, balance }` |
| `POST /charge` | `{ product, connection, amount, reason, idempotencyKey }` | `{ ok, chargeId, balance, duplicate }` |
| `POST /state` | `{ product, connection, value? }` | `{ ok, state }` — dữ liệu nhỏ của app theo người dùng (JSON object ≤ 16KB); có `value` = ghi đè |
| `POST /refund` | `{ product, connection, chargeId, amount? }` | `{ ok, refunded, balance }` |

Lỗi: HTTP 200 `{ ok:false, error }` cho lỗi nghiệp vụ, 400 body sai, 401 khóa sai. Mã: `APP_UNAUTHORIZED`, `TOKEN_INVALID`,
`TOKEN_EXPIRED`, `PRODUCT_MISMATCH`, `CONNECTION_REVOKED` (người dùng ngắt kết nối ở trang Ví, **hoặc app đang dùng mã kết nối cũ**
— xem "mã kết nối xoay vòng"; mời mở lại từ Ephata), `APP_UNAUTHORIZED` cũng gặp khi sản phẩm **chưa tick Đang bán**,
`WALLET_DISABLED`, `INSUFFICIENT_POINTS` (kèm `needed`, `balance`, `topupUrl`), `IDEMPOTENCY_CONFLICT`,
`CHARGE_NOT_FOUND`, `REFUND_EXCEEDS_CHARGE`, `BAD_REQUEST`.

`access.until`: `null` = vĩnh viễn; có ngày = hết hạn lúc đó (gói thuê bao, hạn Full Topping, hoặc hạn gói Pro Giáo Lý Số nếu dùng
miễn phí theo Pro). Hết hạn → `verify` trả `active:false`.

## Code mẫu server (Node / Express)
```js
const BASE = process.env.EPHATA_API_BASE;          // https://www.ephatastore.com/api/apps/v1
const ephata = (path, body) =>
  fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.EPHATA_APP_SECRET}` },
    body: JSON.stringify({ product: process.env.EPHATA_PRODUCT, ...body }),
  }).then((r) => r.json());

// 1) Trang app_url nhận ?ephata_token= → đổi lấy người dùng + mã kết nối
app.get("/", async (req, res) => {
  const token = req.query.ephata_token;
  if (token) {
    const c = await ephata("connect", { launchToken: token });
    if (!c.ok) return res.status(403).send(`Không mở được từ Ephata (${c.error})`);
    // Lưu ở SERVER (DB), gắn với tài khoản trong app: c.user.id (khóa bền) → GHI ĐÈ connection mỗi lần (mã cũ đã hết hiệu lực)
    const user = await upsertUser({ ephataId: c.user.id, email: c.user.email, connection: c.connection });
    req.session.userId = user.id;                    // session chỉ giữ id — KHÔNG giữ connection
    return res.redirect("/");                        // bỏ token khỏi URL
  }
  // ... trang app bình thường (yêu cầu req.session.user)
});

// 2) Trước dịch vụ có phí: kiểm quyền (nếu app bán thuê bao) rồi trừ point
async function chargeForService(userId, amount, reason) {
  const user = await getUserFromDb(userId);           // luôn đọc mã kết nối MỚI NHẤT từ DB
  const v = await ephata("verify", { connection: user.connection });
  if (!v.ok || !v.access.active) throw new Error("Hết quyền dùng — gia hạn trên Ephata");
  const r = await ephata("charge", { connection: user.connection, amount, reason, idempotencyKey: crypto.randomUUID() });
  if (!r.ok) throw Object.assign(new Error(r.error), r);   // INSUFFICIENT_POINTS → hiện r.topupUrl
  return r.chargeId;                                     // dịch vụ lỗi → ephata("refund", { connection, chargeId })
}
```
Python: cùng các lời gọi HTTP trên (`requests.post(f"{BASE}/charge", json={...}, headers={"authorization": f"Bearer {SECRET}"})`).

**Quy tắc**: `idempotencyKey` sinh **một lần cho mỗi lần dùng dịch vụ** và giữ nguyên khi gửi lại (mạng lỗi) — Ephata trả kết
quả cũ (`duplicate:true`), không trừ 2 lần. Riêng lần trừ **đã hoàn hết**: gửi lại khóa đó là trừ mới. Báo giá trước cho người
dùng; trừ khi họ xác nhận.

## Giá & quyền
- **Miễn phí** hoặc **Thuê bao** (giá/tháng: gói năm = ×12, mua lẻ N ngày, dùng thử N ngày) — đặt trong khung **Bán** của form.
- Ô **"Miễn phí cho Pro Giáo Lý Số"**: tick thì tài khoản Pro dùng miễn phí **trong thời gian gói Pro còn hạn**.
- **Full Topping** cũng mở sản phẩm Link ngoài có phí (`access.until` = hạn Topping).
- Có thể **kết hợp**: miễn phí vào app + trừ point theo lượt dùng (bật Ví).

## Đưa lên admin
Ảnh + mô tả + thông tin điền form lấy từ bộ bàn giao **`export.md`** (ảnh bìa 1600×900, logo 512×512, minh họa 1920×1080).

1. **Admin → Thêm sản phẩm → Link ngoài**: tiêu đề, slug, loại Công cụ, mô tả, danh mục, nhà phát hành, ảnh bìa, logo + tối đa 4 ảnh /
   video minh họa (README "Quy ước chung"), khung **Bán**,
   **URL app ngoài** (bắt buộc, bắt đầu bằng `https://` — trang nhận `?ephata_token=`), tick **App trừ point qua Ví Ephata** nếu có
   thu theo lượt. Tick **Đang bán** + **Hiện trên store**. Lưu → admin tự mở trang Sửa.
2. Trang Sửa → khung **Kết nối app ngoài** → **Tạo khóa bí mật** → lưu vào biến môi trường server của app ngay (bật Ví mà chưa có
   khóa, trang Sửa hiện cảnh báo).
3. Slug là `EPHATA_PRODUCT` — đổi slug thì phải đổi biến này ở app (slug bị khóa khi đã có người dùng).

## Kiểm sau khi lên
- Bằng tài khoản admin: mua / dùng thử → **Thư viện → Dùng ngay ↗** → (lần đầu) màn hình cho phép → app
  nhận diện đúng email.
- Mở app ở trình duyệt thứ hai rồi quay lại trình duyệt đầu, dùng dịch vụ có phí → vẫn chạy (app đọc mã mới nhất từ DB).
- Thử 1 lần dịch vụ có phí → lịch sử Ví ghi "Sử dụng · tên app · lý do"; thử ngắt kết nối ở trang Ví → app nhận `CONNECTION_REVOKED`.
