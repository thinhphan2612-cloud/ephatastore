# Prompt bắt đầu một sản phẩm mới cho Ephata

Mở phiên code mới với Claude Code (hoặc AI khác) trong thư mục dự án — repo có sẵn hoặc thư mục trống — rồi dán:

---

Tôi muốn tạo một sản phẩm để bán trên Ephata Store.

Trước tiên tải bộ **Ephata App Kit** vào thư mục `tools/app-kit/` của dự án này, giữ nguyên cấu trúc thư mục,
tải **nguyên văn** (không viết lại), từ:
https://github.com/thinhphan2612-cloud/ephatastore/tree/dev/docs/app-kit
File thô: `https://raw.githubusercontent.com/thinhphan2612-cloud/ephatastore/dev/docs/app-kit/<đường dẫn>` — gồm
`README.md`, `PROMPT.md`, `description.md`, `export.md`, `export/make-images.mjs`, `examples/mo-ta-ai-la-trieu-phu.html`,
`types/download.md`, `types/hosted.md`, `types/link.md`, `types/feature.md`, `types/software.md`,
`license/rust/ephata_license.rs`, `license/node/ephata-license.js`, `license/python/ephata_license.py`,
`ci/tauri-release.yml`, `ci/electron-release.yml`,
`msstore/pack.ps1`, `msstore/AppxManifest.template.xml`.

Sau đó đọc `tools/app-kit/README.md` và làm đúng mục "Hướng dẫn cho AI": phỏng vấn ý tưởng của tôi, chọn 1 trong 5 loại
sản phẩm, xác nhận với tôi, rồi làm theo hướng dẫn của loại đó.
Không commit / push / tạo tag khi chưa hỏi tôi.

Ý tưởng sơ bộ của tôi: <mô tả vài câu — hoặc để trống, AI sẽ hỏi>

---

Loại 2/3/4 không cần thư mục `license/`, `ci/`, `msstore/` — AI có thể bỏ qua khi tải nếu đã chắc loại sản phẩm.
