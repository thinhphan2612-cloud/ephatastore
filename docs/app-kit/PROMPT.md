# Prompt cho AI đang code app của bạn

Đặt thư mục `app-kit/` vào repo app (vd `tools/app-kit/`), điền 2 chỗ `<…>` rồi dán đoạn dưới cho Claude Code
(hoặc AI bạn đang dùng):

---

Đọc `tools/app-kit/README.md`. App này sẽ bán key trên Ephata Store với slug **`<slug Felix cấp>`**.
Làm theo README, theo đúng stack hiện tại của app (`<Tauri | Electron | Python>`):

1. Gắn module license tương ứng trong `tools/app-kit/license/` (mục 1): đặt `PRODUCT` = slug trên,
   KHÔNG sửa `PUBLIC_KEY` / `API_BASE`. Chặn mọi chức năng Pro ở lớp lõi, refresh ngầm khi mở app,
   làm màn hình Bản quyền đủ nút và dịch mã lỗi như bảng mục 1.2.
2. Đồng bộ version ở mọi file (mục 2).
3. Thêm workflow phát hành từ `tools/app-kit/ci/` (mục 3) — kiểm đủ các yêu cầu ghi ở đầu file workflow.
4. Thêm bản build Microsoft Store (mục 5.2–5.3): cờ build tắt kiểm bản mới; StartupTask nếu app tự khởi động;
   chép `tools/app-kit/msstore/` và chỉnh cho app.

Trước khi code: nêu plan ngắn + cách verify từng bước. Chỉ sửa đúng phạm vi trên.
Không commit / push / tạo tag khi chưa hỏi tôi.
Xong thì chạy test được ở máy (build, unit test so semver, thử kích hoạt bằng key giả phải ra LICENSE_NOT_FOUND)
và báo kết quả thật.

---

Sau khi AI làm xong: tự đi tiếp README mục 3 (tag → tải bộ cài) → mục 4 (upload Ephata) → mục 6 (checklist).
