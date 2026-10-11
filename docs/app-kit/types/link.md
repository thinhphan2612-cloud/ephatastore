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
 → /launch/<sản phẩm>: Ephata kiểm quyền (đã mua / free / Pro GLS nếu sản phẩm gắn nhãn)
 → (app bật Ví) lần đầu: màn hình "Cho phép app dùng Ví Ephata?"
 → chuyển sang APP_URL?ephata_token=<token>      (ký Ed25519, hạn 5 phút)
 → server app gọi POST /connect (khóa bí mật)    → nhận user + mã kết nối dài hạn
 → server app dùng mã kết nối để: verify quyền / balance / charge / refund
```

## Cấu hình (lấy ở trang Sửa sản phẩm trên admin, khung "Kết nối app ngoài")
| Biến (server của app) | Giá trị |
|---|---|
| `EPHATA_PRODUCT` | slug sản phẩm |
| `EPHATA_API_BASE` | `https://www.ephatastore.com/api/apps/v1` |
| `EPHATA_APP_SECRET` | khóa bí mật — bấm **Tạo khóa bí mật**; **chỉ hiện một lần**, lưu ngay vào biến môi trường server. Tạo khóa mới = khóa cũ hết hiệu lực. **Không bao giờ** đặt trong code trình duyệt. |
| `EPHATA_PUBLIC_KEY` | khóa công khai Ed25519 (nếu muốn tự kiểm chữ ký token — không bắt buộc) |

## API (server app gọi; header `Authorization: Bearer <EPHATA_APP_SECRET>`; JSON vào/ra)
| Endpoint | Body | Trả về |
|---|---|---|
| `POST /connect` | `{ product, launchToken }` | `{ ok, user:{id,email}, connection, access:{active,until} }` |
| `POST /verify` | `{ product, connection }` | `{ ok, user:{id}, access:{active,until} }` — quyền **hiện tại** |
| `POST /balance` | `{ product, connection }` | `{ ok, balance }` |
| `POST /charge` | `{ product, connection, amount, reason, idempotencyKey }` | `{ ok, chargeId, balance, duplicate }` |
| `POST /refund` | `{ product, connection, chargeId, amount? }` | `{ ok, refunded, balance }` |

Lỗi: HTTP 200 `{ ok:false, error }` cho lỗi nghiệp vụ, 400 body sai, 401 khóa sai. Mã: `APP_UNAUTHORIZED`, `TOKEN_INVALID`,
`TOKEN_EXPIRED`, `PRODUCT_MISMATCH`, `CONNECTION_REVOKED` (người dùng ngắt kết nối — mời mở lại từ Ephata),
`WALLET_DISABLED`, `INSUFFICIENT_POINTS` (kèm `needed`, `balance`, `topupUrl`), `IDEMPOTENCY_CONFLICT`,
`CHARGE_NOT_FOUND`, `REFUND_EXCEEDS_CHARGE`, `BAD_REQUEST`.

`access.until`: `null` = vĩnh viễn; có ngày = thuê bao hết hạn lúc đó. Thuê bao hết hạn → `verify` trả `active:false`.

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
    // Lưu ở SERVER, gắn với tài khoản trong app: c.user.id (khóa bền), c.user.email, c.connection, c.access
    req.session.user = await upsertUser({ ephataId: c.user.id, email: c.user.email, connection: c.connection });
    return res.redirect("/");                        // bỏ token khỏi URL
  }
  // ... trang app bình thường (yêu cầu req.session.user)
});

// 2) Trước dịch vụ có phí: kiểm quyền (nếu app bán thuê bao) rồi trừ point
async function chargeForService(user, amount, reason) {
  const v = await ephata("verify", { connection: user.connection });
  if (!v.ok || !v.access.active) throw new Error("Hết quyền dùng — gia hạn trên Ephata");
  const r = await ephata("charge", { connection: user.connection, amount, reason, idempotencyKey: crypto.randomUUID() });
  if (!r.ok) throw Object.assign(new Error(r.error), r);   // INSUFFICIENT_POINTS → hiện r.topupUrl
  return r.chargeId;                                     // dịch vụ lỗi → ephata("refund", { connection, chargeId })
}
```
Python: cùng các lời gọi HTTP trên (`requests.post(f"{BASE}/charge", json={...}, headers={"authorization": f"Bearer {SECRET}"})`).

**Quy tắc**: `idempotencyKey` sinh **một lần cho mỗi lần dùng dịch vụ** và giữ nguyên khi gửi lại (mạng lỗi) — Ephata trả kết
quả cũ (`duplicate:true`), không trừ 2 lần. Báo giá trước cho người dùng; trừ khi họ xác nhận.

## Giá & quyền
- **Miễn phí** hoặc **Thuê bao** (giá/tháng: gói năm = ×12, mua lẻ N ngày, dùng thử N ngày) — đặt trong khung **Bán** của form.
- Ô **"Miễn phí cho Pro Giáo Lý Số"**: tick thì tài khoản Pro dùng miễn phí.
- Có thể **kết hợp**: miễn phí vào app + trừ point theo lượt dùng (bật Ví).

## Đưa lên admin
1. **Admin → Thêm sản phẩm → Link ngoài**: tiêu đề, slug, loại Công cụ, mô tả, danh mục, nhà phát hành, ảnh bìa, khung **Bán**,
   **URL app ngoài** (trang nhận `?ephata_token=`), tick **App trừ point qua Ví Ephata** nếu có thu theo lượt. Lưu.
2. Mở **Sửa** sản phẩm → khung **Kết nối app ngoài** → **Tạo khóa bí mật** → lưu vào biến môi trường server của app ngay.

## Kiểm sau khi lên
- Bằng tài khoản admin: mua / dùng thử → **Thư viện → Dùng ngay ↗** → (lần đầu) màn hình cho phép → app nhận diện đúng email.
- Thử 1 lần dịch vụ có phí → lịch sử Ví ghi "Sử dụng · tên app · lý do"; thử ngắt kết nối ở trang Ví → app nhận `CONNECTION_REVOKED`.
